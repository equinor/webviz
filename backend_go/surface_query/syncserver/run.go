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
	// The limit of 1 concurrent request is intentionally low for testing purposes; it could probably be safely increased a bit, in production depending on the expected workload and performance characteristics of the processing logic.
	//
	limiter := middleware.ConcurrencyLimit(1, 120*time.Second)

	router.GET("/", handlers.HandleRoot)
	router.POST("/sample_in_points", limiter, handlers.HandleSampleInPoints)

	address := "0.0.0.0:5001"
	logger.Info(fmt.Sprintf("Starting http server on: %v", address))
	router.Run(address)

}
