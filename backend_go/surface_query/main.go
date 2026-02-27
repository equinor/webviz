package main

import (
	"fmt"
	"log/slog"
	"os"
	"runtime"
	"time"

	"surface_query/handlers"

	"github.com/gin-gonic/gin"
	"github.com/lmittmann/tint"
)

func main() {
	logger := slog.New(tint.NewHandler(os.Stdout, &tint.Options{Level: slog.LevelDebug, TimeFormat: time.TimeOnly}))
	slog.SetDefault(logger)

	logger.Info("Starting surface query server...")

	// Can be used to force the number of CPUs that can be executing simultaneously
	// Should only be needed for testing/debugging as long as Go's CPU quota awareness is working as expected (Go 1.25+).
	//runtime.GOMAXPROCS(4)

	// osVisibleCPUCount: Number of logical CPUs visible to the process (not CPU quota aware; for us typically the Kubernetes node CPU count).
	// goMaxParallelism: Current Go scheduler parallelism limit (GOMAXPROCS); CPU quota aware in Go 1.25+.
	// Note: If these values differ, a container CPU quota or explicit GOMAXPROCS override is likely in effect.
	osVisibleCPUCount := runtime.NumCPU()
	goMaxParallelism := runtime.GOMAXPROCS(0)
	logger.Info(fmt.Sprintf("Go CPU configuration: osVisibleCPUCount=%v, goMaxParallelism=%v (GOMAXPROCS)", osVisibleCPUCount, goMaxParallelism))

	goRuntimeVersion := runtime.Version()
	logger.Info(fmt.Sprintf("Go runtime version: %v", goRuntimeVersion))

	router := gin.Default()

	router.GET("/", handlers.HandleRoot)
	router.POST("/sample_in_points", handlers.HandleSampleInPoints)

	address := "0.0.0.0:5001"
	logger.Info(fmt.Sprintf("Surface query server listening on: %v", address))
	router.Run(address)
}
