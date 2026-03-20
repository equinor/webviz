package sample_in_points

import (
	"fmt"
	"log/slog"
	"runtime"
	"time"

	"surface_query/utils"
)

// Surface for a single realization; surface object UUID along with its realization number
type RealSurfObj struct {
	Realization int
	ObjectUuid  string
}

// The set of points to sample in
type PointSet struct {
	XCoords []float64
	YCoords []float64
}

// Sampled values for a single realization
type SamplesForReal struct {
	Realization   int
	SampledValues []float32 // This will be empty if there was an error processing this realization; the error will be in the Err field
	Err           error     // Will be non-nil if there was an error processing this realization
}

func RunSampleInPointsPipeline(batchId uint64, fetcher *utils.BlobFetcher, realSurfObjArr []RealSurfObj, pointSet PointSet) ([]SamplesForReal, error) {
	logger := slog.Default()
	prefix := fmt.Sprintf("sample_in_points(batchId=%d) - ", batchId)

	goMaxParallelism := runtime.GOMAXPROCS(0)
	numDownloadWorkers := max(10, 4*goMaxParallelism)
	numProcessingWorkers := goMaxParallelism

	numRealizations := len(realSurfObjArr)

	logger.Info(prefix + fmt.Sprintf("start sampling %d realization surfaces with workers: download=%d, processing=%d", numRealizations, numDownloadWorkers, numProcessingWorkers))

	startTime := time.Now()

	// What buffer size should we use for the downloadedCh and resultCh channels?
	// For the downloadedCh, we want it to be large enough to allow the download stage to get sufficiently ahead of the processing stage to keep all processing workers busy,
	// but not so large that it allows too much memory usage if the download stage is much faster than the processing stage.
	// Here we go for an approach where it is a multiple of the number of processing workers, which should allow for good throughput while keeping memory usage under control.
	// For the resultCh we simply ensure it's large enough to hold results for all realizations, since these objects are relatively small.
	downloadedCh := make(chan *downloadedSurf, 3*numProcessingWorkers)
	resultCh := make(chan *pipelineResult, numRealizations)

	runDownloadStage(fetcher, realSurfObjArr, numDownloadWorkers, downloadedCh, resultCh)
	runProcessStage(pointSet, numProcessingWorkers, downloadedCh, resultCh)

	totDownloadSizeMb := float32(0)
	numFailedRealizations := int(0)
	perRealSamples := make([]SamplesForReal, 0, numRealizations)

	for plRes := range resultCh {
		totDownloadSizeMb += plRes.downloadSizeMb

		if plRes.err != nil {
			logger.Error(prefix+"error processing realization", "realization", plRes.realization, "err", plRes.err)
			perRealSamples = append(perRealSamples, SamplesForReal{
				Realization: plRes.realization,
				Err:         plRes.err,
			})
			numFailedRealizations++
			continue
		}

		processingDur := plRes.sampleDur + plRes.decodeDur
		logger.Debug(prefix + fmt.Sprintf("realization %d done in %dms, %.2fMB, %.2fMB/s (download=%dms, processing=%dms(%d+%d), queueForDl=%dms, queueForProc=%dms)",
			plRes.realization,
			plRes.totalDur.Milliseconds(),
			plRes.downloadSizeMb, plRes.downloadSizeMb/float32(plRes.totalDur.Seconds()),
			plRes.downloadDur.Milliseconds(),
			processingDur.Milliseconds(), plRes.decodeDur.Milliseconds(), plRes.sampleDur.Milliseconds(),
			plRes.queueForDownloadDur.Milliseconds(),
			plRes.queueForProcessingDur.Milliseconds(),
		))

		perRealSamples = append(perRealSamples, SamplesForReal{
			Realization:   plRes.realization,
			SampledValues: plRes.sampledValues,
		})
	}

	totDuration := time.Since(startTime)
	statString := fmt.Sprintf("%.2fs (download totals: %.2fMB, %.2fMB/s)", totDuration.Seconds(), totDownloadSizeMb, totDownloadSizeMb/(float32(totDuration.Milliseconds())/1000))
	if numFailedRealizations > 0 {
		logger.Warn(prefix + fmt.Sprintf("finished processing %d realization surfaces with %d failures in: %s", numRealizations, numFailedRealizations, statString))
	} else {
		logger.Info(prefix + fmt.Sprintf("finished processing %d realization surfaces in: %s", numRealizations, statString))
	}

	return perRealSamples, nil
}
