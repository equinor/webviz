package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Middleware to limit concurrent requests. Uses a buffered channel as a semaphore.
func ConcurrencyLimit(maxConcurrentRequests int, acquireTimeout time.Duration) gin.HandlerFunc {
	if maxConcurrentRequests <= 0 {
		panic("maxConcurrentRequests must be > 0")
	}
	if acquireTimeout <= 0 {
		panic("acquireTimeout must be > 0")
	}

	logger := slog.Default()

	// Shared semaphore for this middleware instance
	semaphore := make(chan struct{}, maxConcurrentRequests)

	return func(c *gin.Context) {

		ctx := c.Request.Context()

		// Try to acquire a slot
		start := time.Now()
		timer := time.NewTimer(acquireTimeout)
		defer timer.Stop()

		select {
		case semaphore <- struct{}{}:
			// Acquired slot, allow request to proceed
			waitTime := time.Since(start)
			if waitTime > 1*time.Second {
				logger.Debug(fmt.Sprintf("Acquired slot after waiting %.2fs, allowing request to proceed", waitTime.Seconds()))
			}
		case <-timer.C:
			// Timeout wile acquiring slot
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "server busy - too many concurrent requests"})
			return
		case <-ctx.Done():
			// Request cancelled while waiting for slot
			c.AbortWithStatusJSON(http.StatusRequestTimeout, gin.H{"error": "request was cancelled while waiting for slot"})
			return
		}

		// Ensure release
		defer func() {
			<-semaphore
		}()

		// Proceed to next middleware/handler
		c.Next()
	}
}
