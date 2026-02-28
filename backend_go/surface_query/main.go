package main

import (
	"fmt"
	"log/slog"
	"os"
	"runtime"
	"surface_query/legacyserver"
	"time"

	"github.com/lmittmann/tint"
)

func main() {
	logger := slog.New(tint.NewHandler(os.Stdout, &tint.Options{Level: slog.LevelDebug, TimeFormat: time.TimeOnly}))
	slog.SetDefault(logger)

	serverMode := os.Getenv("SURFACE_QUERY_SERVER_MODE")
	if serverMode == "" {
		serverMode = "legacyserver"
	}

	logger.Info(fmt.Sprintf("Launching surface query service in serverMode: %v", serverMode))

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

	switch serverMode {
	case "legacyserver":
		legacyserver.Run()
		os.Exit(0)
	default:
		panic("SURFACE_QUERY_SERVER_MODE must be one: legacyserver")
	}
}
