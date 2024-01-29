package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"runtime"
	utils "surface_intersect/utils"
	xtgeo "surface_intersect/xtgeo"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lmittmann/tint"
)

func main() {
	logger := slog.New(tint.NewHandler(os.Stdout, &tint.Options{Level: slog.LevelDebug, TimeFormat: time.TimeOnly}))
	slog.SetDefault(logger)

	logger.Info("Starting surface query server...")

	// Can be used to force the number of CPUs that can be executing simultaneously
	//runtime.GOMAXPROCS(1)

	numCpus := runtime.NumCPU()
	goMaxProcs := runtime.GOMAXPROCS(0)
	logger.Info(fmt.Sprintf("Num logical CPUs=%v, GOMAXPROCS=%v", numCpus, goMaxProcs))

	router := gin.Default()

	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello World",
		})
	})

	router.POST("/sample_in_points", func(c *gin.Context) {
		// Endpoint to serve intersected surfaces
		var iReq utils.PointSamplingRequest
		if err := c.BindJSON(&iReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			logger.Error("Error parsing request body:", slog.Any("error", err))
			return
		}

		logger.Debug("Request body:", slog.Any("reqBody", iReq))

		// Run in parallell
		var wg sync.WaitGroup
		// Mutual exclusion lock. See below
		var mu sync.Mutex
		startTime := time.Now()
		allZValues := make([][]float32, 0)
		var errArray []error

		for _, realizationObjectId := range iReq.ObjectIds {
			wg.Add(1)

			go func(objectId string) {
				defer wg.Done()

				// Download blob
				data, statusCode, err := utils.FetchBlob(objectId, iReq.BaseUri, &iReq.AuthToken)
				if err != nil || statusCode != 200 {
					mu.Lock()
					errArray = append(errArray, err)
					mu.Unlock()
					return
				}

				// Deserialize blob
				surface, err := xtgeo.DeserializeBlobToSurface(data)
				if err != nil {
					mu.Lock()
					errArray = append(errArray, err)
					mu.Unlock()
					return
				}

				// Intersect
				zValueArr, err := xtgeo.SurfaceZArrFromXYPairs(
					iReq.XCoords, iReq.YCoords,
					int(surface.Nx), int(surface.Ny),
					surface.Xori, surface.Yori,
					surface.Xinc, surface.Yinc,
					1, surface.Rot,
					surface.DataSlice,
					xtgeo.Bilinear,
				)
				if err != nil {
					// Handle error
					logger.Error("Error in SurfaceZArrFromXYPairs:", slog.Any("error", err))
					return
				}
				// Lock the mutex to prevent concurrent access to the slice
				mu.Lock()
				allZValues = append(allZValues, zValueArr)
				mu.Unlock()
			}(realizationObjectId.ObjectUuid)
		}

		wg.Wait()
		duration := time.Now().Sub(startTime)
		logger.Info(fmt.Sprintf("Total time: %v", duration))

		resultArr := make([]utils.RealizationSampleResult, 0)
		for _, zValueArr := range allZValues {
			resultArr = append(resultArr, utils.RealizationSampleResult{Realization: -1, SampledValues: zValueArr})
		}

		// TO-DISCUSS:
		// Must check this out in relation to the xtgeo code
		// Undef value and limit seem to be misaligned!!!
		responseBody := utils.PointSamplingResponse{
			SampleResultArr: resultArr,
			UndefLimit:      0.99e30,
		}
		c.JSON(http.StatusOK, responseBody)
	})

	address := "0.0.0.0:5001"
	logger.Info(fmt.Sprintf("Surface query server listening on: %v", address))
	router.Run(address)
}
