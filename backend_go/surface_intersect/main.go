package main

import (
	"fmt"
	"net/http"
	utils "surface_intersect/utils"
	xtgeo "surface_intersect/xtgeo"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()
	fmt.Println("Starting server...")
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello World",
		})
	})

	router.POST("/intersect_surface", func(c *gin.Context) {
		// Endpoint to serve intersected surfaces
		var iReq utils.IntersectRequest

		if err := c.BindJSON(&iReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Run in parallell
		var wg sync.WaitGroup
		// Mutual exclusion lock. See below
		var mu sync.Mutex
		startTime := time.Now()
		allZValues := make([][]float32, 0)
		var errArray []error

		for _, objectId := range iReq.ObjectIDs {
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
				zValue, err := xtgeo.SurfaceZArrFromXYPairs(
					iReq.Xcoords, iReq.Ycoords,
					int(surface.Nx), int(surface.Ny),
					surface.Xori, surface.Yori,
					surface.Xinc, surface.Yinc,
					1, surface.Rot,
					surface.DataSlice,
					xtgeo.Bilinear,
				)
				if err != nil {
					// Handle error
					fmt.Printf("Error in SurfaceZArrFromXYPairs: %v\n", err)
					return
				}
				// Lock the mutex to prevent concurrent access to the slice
				mu.Lock()
				allZValues = append(allZValues, zValue)
				mu.Unlock()
			}(objectId)
		}

		wg.Wait()
		duration := time.Now().Sub(startTime)
		fmt.Printf("Total time: %v\n", duration)

		c.JSON(http.StatusOK, allZValues)
	})

	router.Run(":5001") // Listen and serve on 0.0.0.0:5001
}
