package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"surface_query/syncserver/logic/sample_in_points"
	"surface_query/utils"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
)

type RealizationObjectId struct {
	Realization int    `json:"realization" binding:"required"`
	ObjectUuid  string `json:"objectUuid" binding:"required"`
}

type pointSamplingRequest struct {
	SasToken         string                `json:"sasToken" binding:"required"`
	BlobStoreBaseUri string                `json:"blobStoreBaseUri" binding:"required"`
	ObjectIds        []RealizationObjectId `json:"objectIds" binding:"required"`
	XCoords          []float64             `json:"xCoords" binding:"required"`
	YCoords          []float64             `json:"yCoords" binding:"required"`
}

type RealizationSampleResult struct {
	Realization   int       `json:"realization" binding:"required"`
	SampledValues []float32 `json:"sampledValues" binding:"required"`
}

type PointSamplingResponse struct {
	SampleResultArr    []RealizationSampleResult `json:"sampleResultArr" binding:"required"`
	UndefLimit         float32                   `json:"undefLimit" binding:"required"`
	FailedRealizations []int                     `json:"failedRealizations" binding:"required"`
}

var nextBatchId uint64

func HandleSampleInPoints(c *gin.Context) {
	logger := slog.Default()

	var requestBody pointSamplingRequest
	if err := c.BindJSON(&requestBody); err != nil {
		logger.Error("Error parsing request body:", slog.Any("error", err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	//logger.Debug("Request body:", slog.Any("reqBody", requestBody))

	startTime := time.Now()

	numRealizations := len(requestBody.ObjectIds)
	perRealSurfObjs := make([]sample_in_points.RealSurfObj, numRealizations)
	for i := 0; i < numRealizations; i++ {
		perRealSurfObjs[i] = sample_in_points.RealSurfObj(requestBody.ObjectIds[i])
	}

	pointSet := sample_in_points.PointSet{
		XCoords: requestBody.XCoords,
		YCoords: requestBody.YCoords,
	}

	batchId := atomic.AddUint64(&nextBatchId, 1)
	blobFetcher := utils.NewBlobFetcher(requestBody.SasToken, requestBody.BlobStoreBaseUri)
	perRealSamplesArr, err := sample_in_points.RunSampleInPointsPipeline(batchId, blobFetcher, perRealSurfObjs, pointSet)
	if err != nil {
		logger.Error("Error during point sampling of surfaces:", "batchId", batchId, slog.Any("error", err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Construct the response body
	// How should we handle the case where some realizations failed to download or process?
	// The solution now is to report a separate list of the failed realizations, maybe we want to include error messages as well?
	retResultArr := make([]RealizationSampleResult, 0, len(perRealSamplesArr))
	retFailedRealizations := make([]int, 0)
	for _, item := range perRealSamplesArr {
		if item.Err != nil {
			retFailedRealizations = append(retFailedRealizations, item.Realization)
			continue
		}

		retResultArr = append(retResultArr, RealizationSampleResult{
			Realization:   item.Realization,
			SampledValues: item.SampledValues,
		})
	}

	responseBody := PointSamplingResponse{
		SampleResultArr:    retResultArr,
		UndefLimit:         0.99e30,
		FailedRealizations: retFailedRealizations,
	}
	c.JSON(http.StatusOK, responseBody)

	duration := time.Since(startTime)
	logger.Info(fmt.Sprintf("Total time (batchId=%d): %.2fs", batchId, duration.Seconds()))
}
