package sample_in_points

import (
	"context"
	"fmt"
	"sync"
	"time"

	"surface_query/utils"
	"surface_query/xtgeo"
)

type pipelineResult struct {
	realization   int
	sampledValues []float32
	err           error
	// Performance metrics
	downloadDur           time.Duration
	decodeDur             time.Duration
	sampleDur             time.Duration
	queueForDownloadDur   time.Duration
	queueForProcessingDur time.Duration
	downloadStartTime     time.Time
	downloadSizeMb        float32
	totalDur              time.Duration // Total duration from from start of download to end of sampling
}

type downloadJob struct {
	realization int
	objectUuid  string
	enqueuedAt  time.Time
}

type downloadedSurf struct {
	realization int
	rawByteData []byte
	res         *pipelineResult
	enqueuedAt  time.Time
}

// runDownloadStage() fetches surface data from a blob storage for multiple realizations concurrently.
// It distributes fetch tasks among numWorkers goroutines, measures download performance metrics,
// and sends downloaded data to outCh for processing.
// If a download fails, the error is registered in the pipelineResult and will be picked up by the
// processing stage to be included in the final results.
// The function closes outCh when all downloads complete, signaling the end of the download stage.
//
// Parameters:
//   - fetcher: BlobFetcher used to download surface objects by UUID
//   - realSurfObjArr: Array of surface objects to download, one per realization
//   - numWorkers: Number of concurrent goroutines to use for downloading
//   - outCh: Output channel to send downloaded surfaces to for further processing
func runDownloadStage(ctx context.Context, fetcher *utils.BlobFetcher, realSurfObjArr []RealSurfObj, numWorkers int, outCh chan<- *downloadedSurf) {
	if numWorkers <= 0 {
		panic("runDownloadStage: numWorkers must be > 0")
	}

	// Create a buffered channel and fill it with all the download jobs (surface objects to fetch)
	// Each worker goroutine will read from this channel until it's empty, allowing for dynamic load balancing of download tasks
	downloadJobs := make(chan downloadJob, len(realSurfObjArr))
	for _, realSurfObj := range realSurfObjArr {
		downloadJobs <- downloadJob{
			realization: realSurfObj.Realization,
			objectUuid:  realSurfObj.ObjectUuid,
			enqueuedAt:  time.Now(),
		}
	}
	close(downloadJobs)

	// Start the worker pool for downloading surfaces concurrently.
	// Each worker will read from the downloadJobs channel, perform the download, and send results to the outCh channel for processing.
	var wg sync.WaitGroup
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)

		go func() {
			defer wg.Done()
			runDownloadWorker(ctx, fetcher, downloadJobs, outCh)
		}()
	}

	go func() {
		wg.Wait()
		close(outCh)
	}()
}

func runDownloadWorker(ctx context.Context, fetcher *utils.BlobFetcher, downloadJobs <-chan downloadJob, outCh chan<- *downloadedSurf) {
	// Process download jobs until the downloadJobs channel is closed and all jobs are consumed
	// The select statement allows the goroutine to also listen for cancellation via ctx.Done()
	for {
		select {
		case <-ctx.Done():
			// Context cancelled (e.g. request aborted or timeout) -> stop worker
			return
		case job, ok := <-downloadJobs:
			if !ok {
				// No more jobs -> worker exits
				return
			}

			downloadStartTime := time.Now()

			res := &pipelineResult{
				realization:         job.realization,
				downloadStartTime:   downloadStartTime,
				queueForDownloadDur: downloadStartTime.Sub(job.enqueuedAt),
			}

			byteArr, err := fetcher.FetchAsBytesWithContext(ctx, job.objectUuid)
			res.downloadDur = time.Since(downloadStartTime)
			res.downloadSizeMb = float32(len(byteArr)) / (1024 * 1024)

			if err != nil {
				// Download failed, so register the error in the result
				res.err = fmt.Errorf("failed to download surface for realization %d (%s): %w", job.realization, job.objectUuid, err)
			}

			select {
			case <-ctx.Done():
				return
			case outCh <- &downloadedSurf{
				realization: job.realization,
				rawByteData: byteArr,
				res:         res,
				enqueuedAt:  time.Now(),
			}:
			}
		}
	}
}

// runProcessStage() receives downloaded surface data from inCh, processes it by decoding and sampling values at specified points,
// and sends the results to resultCh. It uses numWorkers goroutines to process multiple surfaces concurrently.
// Each worker reads from inCh until it's closed, allowing for dynamic load balancing of processing tasks.
//
// Parameters:
//   - pointSet: The set of XY coordinates to sample values at
//   - numWorkers: Number of concurrent goroutines to use for processing
//   - inCh: Input channel to receive downloaded surface data for processing
//   - resultCh: Output channel to send processed results
func runProcessStage(ctx context.Context, pointSet PointSet, numWorkers int, inCh <-chan *downloadedSurf, resultCh chan<- *pipelineResult) {
	if numWorkers <= 0 {
		panic("runProcessStage: numWorkers must be > 0")
	}

	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)

		go func() {
			defer wg.Done()
			runProcessWorker(ctx, pointSet, inCh, resultCh)
		}()
	}

	go func() {
		wg.Wait()
		close(resultCh)
	}()
}

func runProcessWorker(
	ctx context.Context,
	pointSet PointSet,
	inCh <-chan *downloadedSurf,
	resultCh chan<- *pipelineResult,
) {
	for {
		select {
		case <-ctx.Done():
			// Context cancelled (e.g. request aborted or timeout) -> stop worker
			return

		case downloaded, ok := <-inCh:
			if !ok {
				// No more downloaded surfaces -> worker exits
				return
			}

			// If there was an error during download, we skip processing and send the error result immediately
			if downloaded.res.err != nil {
				if !sendResultOrCancel(ctx, resultCh, downloaded.res) {
					return
				}
				continue
			}

			res := downloaded.res

			decodeStartTime := time.Now()
			res.queueForProcessingDur = decodeStartTime.Sub(downloaded.enqueuedAt)

			surface, err := xtgeo.DeserializeBlobToSurface(downloaded.rawByteData)
			res.decodeDur = time.Since(decodeStartTime)

			// Release reference to the raw download buffer as soon as possible.
			downloaded.rawByteData = nil

			if err != nil {
				res.err = fmt.Errorf("failed to decode surface for realization %d: %w", downloaded.realization, err)
				if !sendResultOrCancel(ctx, resultCh, res) {
					return
				}

				continue
			}

			sampleStartTime := time.Now()

			res.sampledValues, _ = xtgeo.SurfaceZArrFromXYPairs(
				pointSet.XCoords, pointSet.YCoords,
				int(surface.Nx), int(surface.Ny),
				surface.Xori, surface.Yori,
				surface.Xinc, surface.Yinc,
				1, surface.Rot,
				surface.DataSlice,
				xtgeo.Bilinear,
			)

			res.sampleDur = time.Since(sampleStartTime)
			res.totalDur = time.Since(res.downloadStartTime)

			if !sendResultOrCancel(ctx, resultCh, res) {
				return
			}
		}
	}
}

// sendResultOrCancel attempts to send a pipelineResult to resultCh, but first checks if the context has been cancelled.
// If the context is cancelled, it returns false and does not attempt to send the result.
// If the context is still active, it sends the result to resultCh and returns true.
func sendResultOrCancel(ctx context.Context, resultCh chan<- *pipelineResult, res *pipelineResult) bool {
	select {
	case <-ctx.Done():
		return false
	case resultCh <- res:
		return true
	}
}
