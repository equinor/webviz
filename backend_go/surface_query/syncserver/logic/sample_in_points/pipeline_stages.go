package sample_in_points

import (
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

type downloadedSurf struct {
	realization int
	rawByteData []byte
	res         *pipelineResult
	enqueuedAt  time.Time
}

// runDownloadStage fetches surface data from a blob storage for multiple realizations concurrently.
// It distributes fetch tasks among numWorkers goroutines, measures download performance metrics,
// and sends downloaded data to outCh for processing. If a download fails, the error is sent to resultCh.
// The function closes outCh when all downloads complete, signaling the end of the download stage.
//
// Parameters:
//   - fetcher: BlobFetcher used to download surface objects by UUID
//   - realSurfObjArr: Array of surface objects to download, one per realization
//   - numWorkers: Number of concurrent goroutines to use for downloading
//   - outCh: Output channel to send successfully downloaded surfaces to for further processing
//   - resultCh: The final output channel, used here to send errors directly if a download fails
func runDownloadStage(fetcher *utils.BlobFetcher, realSurfObjArr []RealSurfObj, numWorkers int, outCh chan<- *downloadedSurf, resultCh chan<- *pipelineResult) {
	if numWorkers <= 0 {
		panic("runDownloadStage: numWorkers must be > 0")
	}

	stageStartTime := time.Now()

	// Create a buffered channel and fill it with all the download jobs (surface objects to fetch)
	// Each worker goroutine will read from this channel until it's empty, allowing for dynamic load balancing of download tasks
	downloadJobs := make(chan RealSurfObj, len(realSurfObjArr))
	for _, realSurfObj := range realSurfObjArr {
		downloadJobs <- realSurfObj
	}
	close(downloadJobs)

	// Start the worker pool for downloading surfaces concurrently.
	// Each worker will read from the downloadJobs channel, perform the download, and send results to the outCh channel for processing.
	// Errors are sent directly to resultCh.
	var wg sync.WaitGroup
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)

		go func() {
			defer wg.Done()

			// Process download jobs until the downloadJobs channel is closed and all jobs are consumed
			for realSurfObj := range downloadJobs {
				downloadStartTime := time.Now()

				res := &pipelineResult{
					realization:         realSurfObj.Realization,
					downloadStartTime:   downloadStartTime,
					queueForDownloadDur: time.Since(stageStartTime),
				}

				byteArr, err := fetcher.FetchAsBytes(realSurfObj.ObjectUuid)
				res.downloadDur = time.Since(downloadStartTime)
				res.downloadSizeMb = float32(len(byteArr)) / (1024 * 1024)

				if err != nil {
					res.err = fmt.Errorf("failed to download surface for realization %d (%s): %w", realSurfObj.Realization, realSurfObj.ObjectUuid, err)
					resultCh <- res
					continue
				}

				outCh <- &downloadedSurf{
					realization: realSurfObj.Realization,
					rawByteData: byteArr,
					res:         res,
					enqueuedAt:  time.Now(),
				}
			}
		}()
	}

	go func() {
		wg.Wait()
		close(outCh)
	}()
}

// runProcessStage receives downloaded surface data from inCh, processes it by decoding and sampling values at specified points,
// and sends the results to resultCh. It uses numWorkers goroutines to process multiple surfaces concurrently.
// Each worker reads from inCh until it's closed, allowing for dynamic load balancing of processing tasks.
//
// Parameters:
//   - pointSet: The set of XY coordinates to sample values at
//   - numWorkers: Number of concurrent goroutines to use for processing
//   - inCh: Input channel to receive downloaded surface data for processing
//   - resultCh: Output channel to send processed results
func runProcessStage(pointSet PointSet, numWorkers int, inCh <-chan *downloadedSurf, resultCh chan<- *pipelineResult) {
	if numWorkers <= 0 {
		panic("runProcessStage: numWorkers must be > 0")
	}

	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)

		go func() {
			defer wg.Done()

			for downloaded := range inCh {
				res := downloaded.res

				startDecode := time.Now()
				res.queueForProcessingDur = startDecode.Sub(downloaded.enqueuedAt)

				surface, err := xtgeo.DeserializeBlobToSurface(downloaded.rawByteData)
				res.decodeDur = time.Since(startDecode)

				// Release reference to the raw download buffer as soon as possible.
				downloaded.rawByteData = nil

				if err != nil {
					res.err = fmt.Errorf("failed to decode surface for realization %d: %w", downloaded.realization, err)
					resultCh <- res
					continue
				}

				startSample := time.Now()

				res.sampledValues, _ = xtgeo.SurfaceZArrFromXYPairs(
					pointSet.XCoords, pointSet.YCoords,
					int(surface.Nx), int(surface.Ny),
					surface.Xori, surface.Yori,
					surface.Xinc, surface.Yinc,
					1, surface.Rot,
					surface.DataSlice,
					xtgeo.Bilinear,
				)

				res.sampleDur = time.Since(startSample)

				res.totalDur = time.Since(res.downloadStartTime)
				resultCh <- res
			}
		}()
	}

	go func() {
		wg.Wait()
		close(resultCh)
	}()
}
