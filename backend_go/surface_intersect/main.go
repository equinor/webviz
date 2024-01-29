package main

import (
	"fmt"
	"log/slog"
	"os"
	"runtime"
	"time"

	_ "go.uber.org/automaxprocs"

	"surface_intersect/handlers"

	"github.com/gin-gonic/gin"
	"github.com/lmittmann/tint"
)

func main() {
	logger := slog.New(tint.NewHandler(os.Stdout, &tint.Options{Level: slog.LevelDebug, TimeFormat: time.TimeOnly}))
	slog.SetDefault(logger)

	logger.Info("Starting surface query server...")

	// Can be used to force the number of CPUs that can be executing simultaneously
	//runtime.GOMAXPROCS(4)

	numCpus := runtime.NumCPU()
	goMaxProcs := runtime.GOMAXPROCS(0)
	logger.Info(fmt.Sprintf("Num logical CPUs=%v, GOMAXPROCS=%v", numCpus, goMaxProcs))

	router := gin.Default()

	router.GET("/", handlers.HandleRoot)
	router.POST("/sample_in_points", handlers.HandleSampleInPoints)

	address := "0.0.0.0:5001"
	logger.Info(fmt.Sprintf("Surface query server listening on: %v", address))
	router.Run(address)
}
