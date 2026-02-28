package utils

import (
	"fmt"
	"log/slog"

	"github.com/gin-gonic/gin"
)

// SlogBackedGinLogger returns a Gin middleware that logs requests using the provided slog.Logger.
func SlogBackedGinLogger(targetSlogLogger *slog.Logger) gin.HandlerFunc {

	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {

		msgText := fmt.Sprintf("[GIN] %3d | %-4s %#v", param.StatusCode, param.Method, param.Path)

		if param.ErrorMessage != "" {
			msgText += fmt.Sprintf("\n%s", param.ErrorMessage)
		}

		targetSlogLogger.Info(msgText,
			slog.Duration("latency", param.Latency),
			slog.String("client_ip", param.ClientIP),
		)

		// Return empty string so that Gin doesn't print anything itself
		return ""
	})
}
