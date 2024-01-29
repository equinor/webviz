package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"surface_intersect/operations"
	"surface_intersect/utils"
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
	XCoords          []float32             `json:"xCoords" binding:"required"`
	YCoords          []float32             `json:"yCoords" binding:"required"`
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

	perRealObjIds := make([]operations.RealObjId, len(requestBody.ObjectIds))
	for i := range requestBody.ObjectIds {
		perRealObjIds[i] = operations.RealObjId(requestBody.ObjectIds[i])
	}

	blobFetcher := utils.NewBlobFetcher(requestBody.SasToken, requestBody.BlobStoreBaseUri)
	perRealSamplesArr, err := operations.BulkFetchAndSampleSurfaces(blobFetcher, perRealObjIds, requestBody.XCoords, requestBody.YCoords)
	if err != nil {
		logger.Error("Error during bulk processing of surfaces:", slog.Any("error", err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Construct the response body
	//
	// TO-DISCUSS:
	// Must check this out in relation to the xtgeo code
	// Undef value and limit seem to be misaligned!!!
	retResultArr := make([]RealizationSampleResult, len(perRealSamplesArr))
	for i := range retResultArr {
		retResultArr[i] = RealizationSampleResult(perRealSamplesArr[i])
	}

	responseBody := PointSamplingResponse{
		SampleResultArr: retResultArr,
		UndefLimit:      0.99e30,
	}
	c.JSON(http.StatusOK, responseBody)

	duration := time.Now().Sub(startTime)
	logger.Info(fmt.Sprintf("Total time: %v", duration))
}
