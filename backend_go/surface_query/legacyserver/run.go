package legacyserver

import (
	"fmt"
	"log/slog"

	"surface_query/legacyserver/handlers"
	"surface_query/utils"

	"github.com/gin-gonic/gin"
)

func Run() {
	logger := slog.Default()

	logger.Info("Starting surface query legacy http server...")

	router := gin.New()
	router.Use(utils.SlogBackedGinLogger(logger))
	router.Use(gin.Recovery())

	router.GET("/", handlers.HandleRoot)
	router.POST("/sample_in_points", handlers.HandleSampleInPoints)

	address := "0.0.0.0:5001"
	logger.Info(fmt.Sprintf("Starting http server on: %v", address))
	router.Run(address)

}
