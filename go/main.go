package main

import "C"
import (
	"fmt"
	utils "intersectTest/utils"
	xtgeo "intersectTest/xtgeo"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

func convertFloat32toFloat64(float32Slice []float32) []float64 {
	float64Slice := make([]float64, len(float32Slice))
	for i, value := range float32Slice {
		float64Slice[i] = float64(value)
	}
	return float64Slice
}

func main() {
	router := gin.Default()
	fmt.Println("Starting server...")
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello World",
		})
	})

	router.POST("/intersectSurface", func(c *gin.Context) {
		// Endpoint to serve intersected surfaces
		var iReq utils.IntersectRequest

		if err := c.BindJSON(&iReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		dataMap, err := downloadBlobsRaw(iReq.ObjectIDs, iReq.AuthToken, iReq.BaseUri)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err})
			return
		}

		// Run in parallell
		var wg sync.WaitGroup
		// Mutual exclusion lock. See below
		var mu sync.Mutex
		startTime := time.Now()
		allZValues := make([][]float64, 0)

		for _, data := range dataMap {
			wg.Add(1)
			go func(data []byte) {
				defer wg.Done()
				surface, err := utils.DeserializeBlobToSurface(data)
				if err != nil {
					// Handle error
					fmt.Printf("Error in DeserializeBlobToSurface: %v\n", err)
					return
				}

				zValue := xtgeo.XSurfGetZVFromXYV(
					iReq.Xcoords, iReq.Ycoords,
					int(surface.Nx), int(surface.Ny),
					float64(surface.Xori), float64(surface.Yori),
					float64(surface.Xinc), float64(surface.Yinc),
					1, float64(surface.Rot),
					convertFloat32toFloat64(surface.DataSlice),
					0,
				)
				// Lock the mutex to prevent concurrent access to the slice
				mu.Lock()
				allZValues = append(allZValues, zValue)
				mu.Unlock()
			}(data)
		}

		wg.Wait()
		duration := time.Now().Sub(startTime)
		fmt.Printf("Time spent in intersect: %v\n", duration)

		c.JSON(http.StatusOK, allZValues)
	})

	router.Run(":5001") // Listen and serve on 0.0.0.0:5001
}

func downloadBlobsRaw(objectIds []string, sasToken string, baseUrl string) (map[string][]byte, []error) {
	// Start timing
	startTime := time.Now()
	dataMap, errArray := GetBlobsRaw(objectIds, sasToken, baseUrl)
	downloadTime := time.Now()
	durationDownload := downloadTime.Sub(startTime)
	fmt.Printf("Time spent in GetBlobsRaw: %v\n", durationDownload)
	var totalSize int
	for _, blob := range dataMap {
		totalSize += len(blob) // Assuming blob is a byte slice
	}
	const bytesPerMB = 1048576
	downloadSpeed := float64(totalSize) / durationDownload.Seconds() / bytesPerMB

	fmt.Printf("Download speed: %f mbytes/sec\n", downloadSpeed)
	fmt.Printf("Size: %f MB\n", float64(totalSize)/bytesPerMB)
	fmt.Printf("dataMap length: %v\n", len(dataMap))
	fmt.Printf("errArray length: %v\n", len(errArray))
	return dataMap, errArray
}

func GetBlobsRaw(objectIds []string, sasToken string, baseUrl string) (map[string][]byte, []error) {
	var wg sync.WaitGroup
	dataMap := make(map[string][]byte)
	errorChan := make(chan error, len(objectIds))

	var mutex sync.Mutex

	for _, objectId := range objectIds {
		wg.Add(1)
		go GetBlobRaw(objectId, dataMap, &wg, &mutex, &sasToken, baseUrl, errorChan)
	}

	go func() {
		wg.Wait()
		close(errorChan)
	}()

	var errArray []error
	for err := range errorChan {
		errArray = append(errArray, err)
	}

	fmt.Printf("errArray length: %v\n", len(errArray))
	return dataMap, errArray
}
func GetBlobRaw(objectId string, dataMap map[string][]byte, wg *sync.WaitGroup, mutex *sync.Mutex, sasToken *string, baseUrl string, errorChannel chan<- error) {
	defer wg.Done()
	bytesResp, statusCode, err := FetchBlob(objectId, baseUrl, sasToken)

	mutex.Lock()
	defer mutex.Unlock()

	if err != nil {
		dataMap[objectId] = nil
		errorChannel <- fmt.Errorf("objectId %v: %v", objectId, err.Error())
		return
	}

	if statusCode == 200 {
		dataMap[objectId] = bytesResp
	} else {
		dataMap[objectId] = nil
		errorChannel <- fmt.Errorf("objectId %v: status code %v not 200", objectId, statusCode)
	}
}

func FetchBlob(objectId string, baseUrl string, sasToken *string) ([]byte, int, error) {

	blobUrl := baseUrl + "/" + objectId + "?" + *sasToken

	bytesResp, statusCode, err := HttpGet(blobUrl)
	if err != nil {
		return nil, 500, err
	}
	return bytesResp, statusCode, nil

}
func HttpGet(url string) ([]byte, int, error) {
	res, err := http.Get(url)
	if err != nil {
		return nil, 500, err
	}

	defer res.Body.Close()

	body, err2 := io.ReadAll(res.Body)
	if err2 != nil {
		return nil, 500, err2
	}

	return body, res.StatusCode, nil
}
