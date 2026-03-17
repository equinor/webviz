package sample_in_points

import (
	"fmt"
	"log/slog"
	"runtime"
	"time"

	"surface_query/utils"
)

// Surface fro a single realization; surface object UUID along with its realization number
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
	SampledValues []float32
}

func RunSampleInPointsPipeline(fetcher *utils.BlobFetcher, realSurfObjArr []RealSurfObj, pointSet PointSet) ([]SamplesForReal, error) {
	logger := slog.Default()
	prefix := "sample_in_points - "

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
	perRealSamples := make([]SamplesForReal, 0, numRealizations)

	for plRes := range resultCh {
		processingDur := plRes.sampleDur + plRes.decodeDur
		logger.Debug(prefix + fmt.Sprintf("realization %d done in %dms, %.2fMB, %.2fMB/s (download=%dms, processing=%dms(%d+%d), queueDownload=%dms, queueProcessing=%dms)",
			plRes.realization,
			plRes.totalDur.Milliseconds(),
			plRes.downloadSizeMb, plRes.downloadSizeMb/float32(plRes.totalDur.Seconds()),
			plRes.downloadDur.Milliseconds(),
			processingDur.Milliseconds(), plRes.decodeDur.Milliseconds(), plRes.sampleDur.Milliseconds(),
			plRes.queueForDownloadDur.Milliseconds(),
			plRes.queueForProcessingDur.Milliseconds(),
		))

		if plRes.err != nil {
			logger.Error("Error processing realization", "realization", plRes.realization, "err", plRes.err)
		}

		totDownloadSizeMb += plRes.downloadSizeMb

		perRealSamples = append(perRealSamples, SamplesForReal{
			Realization:   plRes.realization,
			SampledValues: plRes.sampledValues,
		})
	}

	totDuration := time.Since(startTime)
	logger.Info(prefix + fmt.Sprintf("finished processing %d realization surfaces in %.2fs (download totals: %.2fMB, %.2fMB/s)", numRealizations, totDuration.Seconds(), totDownloadSizeMb, totDownloadSizeMb/(float32(totDuration.Milliseconds())/1000)))

	return perRealSamples, nil
}
