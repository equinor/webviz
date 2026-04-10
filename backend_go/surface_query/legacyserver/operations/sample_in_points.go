package operations

import (
	"fmt"
	"log/slog"
	"surface_query/utils"
	"surface_query/xtgeo"
	"sync"
)

type RealObjId struct {
	Realization int
	ObjectUuid  string
}

type RealSamplesRes struct {
	Realization   int
	SampledValues []float32
}

func BulkFetchAndSampleSurfaces(fetcher *utils.BlobFetcher, realObjIdArr []RealObjId, xCoords []float64, yCoords []float64) ([]RealSamplesRes, error) {
	logger := slog.Default()

	numObjectIds := len(realObjIdArr)

	// Pre-allocate the working arrays with the known length so we can access them without locking
	type ResultItem struct {
		sampledValues []float32
	}
	resultItemArr := make([]*ResultItem, numObjectIds)
	errorArray := make([]error, numObjectIds)

	var wg sync.WaitGroup
	for idx, realObjId := range realObjIdArr {
		idx := idx
		objectUuid := realObjId.ObjectUuid
		realization := realObjId.Realization

		wg.Add(1)

		go func() {
			defer wg.Done()

			valueArr, stats, err := fetchAndSampleSurface(fetcher, objectUuid, xCoords, yCoords)
			if err != nil {
				errorArray[idx] = err
			} else {
				resultItemArr[idx] = &ResultItem{sampledValues: valueArr}
				logger.Debug(
					fmt.Sprintf("BulkFetchAndSampleSurfaces for real=%v took %vms (%.2fMB, %.2fMB/s)", realization, stats.tot_ms, stats.size_mb, stats.size_mb/(float32(stats.fetch_ms)/1000)),
					slog.Int64("fetch_ms", stats.fetch_ms),
					slog.Int64("decode_ms", stats.decode_ms),
					slog.Int64("sample_ms", stats.sample_ms),
				)
			}
		}()
	}

	wg.Wait()

	// Construct return array
	returnArr := make([]RealSamplesRes, 0)
	for idx, realizationObjectId := range realObjIdArr {
		if resultItemArr[idx] != nil {
			realResult := RealSamplesRes{
				Realization:   realizationObjectId.Realization,
				SampledValues: resultItemArr[idx].sampledValues,
			}
			returnArr = append(returnArr, realResult)
		}
	}

	return returnArr, nil
}

type surfStats struct {
	fetch_ms  int64
	decode_ms int64
	sample_ms int64
	tot_ms    int64
	size_mb   float32
}

func fetchAndSampleSurface(fetcher *utils.BlobFetcher, surfObjectUuid string, xCoords []float64, yCoords []float64) ([]float32, *surfStats, error) {
	logger := slog.Default()

	surfStats := surfStats{}
	tim := utils.NewPerfTimer()

	blobBytes, err := fetcher.FetchAsBytes(surfObjectUuid)
	if err != nil {
		logger.Error("Error fetching blob:", slog.Any("error", err))
		return nil, nil, err
	}
	surfStats.size_mb = float32(len(blobBytes)) / 1024 / 1024
	surfStats.fetch_ms = tim.Lap_ms()

	surface, err := xtgeo.DeserializeBlobToSurface(blobBytes)
	if err != nil {
		logger.Error("Error decoding blob as surface:", slog.Any("error", err))
		return nil, nil, err
	}
	surfStats.decode_ms = tim.Lap_ms()

	// Sample the surface
	zValueArr, err := xtgeo.SurfaceZArrFromXYPairs(
		xCoords, yCoords,
		int(surface.Nx), int(surface.Ny),
		surface.Xori, surface.Yori,
		surface.Xinc, surface.Yinc,
		1, surface.Rot,
		surface.DataSlice,
		xtgeo.Bilinear,
	)
	if err != nil {
		logger.Error("Error in SurfaceZArrFromXYPairs:", slog.Any("error", err))
		return nil, nil, err
	}
	surfStats.sample_ms = tim.Lap_ms()
	surfStats.tot_ms = tim.Elapsed_ms()

	return zValueArr, &surfStats, nil
}
