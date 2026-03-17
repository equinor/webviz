package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"surface_query/syncserver/logic/sample_in_points"
	"surface_query/utils"
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
	SampleResultArr []RealizationSampleResult `json:"sampleResultArr" binding:"required"`
	UndefLimit      float32                   `json:"undefLimit" binding:"required"`
}

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

	blobFetcher := utils.NewBlobFetcher(requestBody.SasToken, requestBody.BlobStoreBaseUri)
	perRealSamplesArr, err := sample_in_points.RunSampleInPointsPipeline(blobFetcher, perRealSurfObjs, pointSet)
	if err != nil {
		logger.Error("Error during bulk processing of surfaces:", slog.Any("error", err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Construct the response body
	retResultArr := make([]RealizationSampleResult, len(perRealSamplesArr))
	for i := range retResultArr {
		retResultArr[i] = RealizationSampleResult(perRealSamplesArr[i])
	}

	responseBody := PointSamplingResponse{
		SampleResultArr: retResultArr,
		UndefLimit:      0.99e30,
	}
	c.JSON(http.StatusOK, responseBody)

	duration := time.Since(startTime)
	logger.Info(fmt.Sprintf("Total time: %.2fs", duration.Seconds()))
}
