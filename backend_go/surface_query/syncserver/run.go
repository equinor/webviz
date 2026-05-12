package syncserver

import (
	"fmt"
	"log/slog"
	"time"

	"surface_query/middleware"
	"surface_query/syncserver/handlers"

	"github.com/gin-gonic/gin"
)

func Run() {
	logger := slog.Default()

	logger.Info("Starting surface query sync http server...")

	router := gin.New()
	router.Use(middleware.SlogBackedGinLogger(logger))
	router.Use(gin.Recovery())

	// Use our concurrency limiting middleware to cap the number of concurrent requests.
	// This should help prevent memory overload and provide more predictable performance under load by queueing excess requests rather than allowing them to execute concurrently.
	//
	// The concurrency limit is currently set to 20 based on the current memory size for the component and the expected memory usage of the processing logic.
	// A limit of 1 concurrent request can be set, effectively disabling concurrency, which can be useful for testing and debugging.
	//
	// Question: Should we fail fast or queue when the concurrency limit is exceeded?
	// For now we go with queueing, which should provide better performance and user experience under load at the cost of potentially increased latency for some requests.
	// If we were to fail fast instead, clients would need to implement their own retry logic.
	limiter := middleware.ConcurrencyLimit(20, 120*time.Second)

	router.GET("/", handlers.HandleRoot)
	router.POST("/sample_in_points", limiter, handlers.HandleSampleInPoints)

	address := "0.0.0.0:5001"
	logger.Info(fmt.Sprintf("Starting http server on: %v", address))
	router.Run(address)

}
