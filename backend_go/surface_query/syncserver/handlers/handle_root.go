package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func HandleRoot(c *gin.Context) {
	c.String(http.StatusOK, fmt.Sprintf("Surface query server is alive at %v", time.Now().Format(time.RFC3339)))
}
