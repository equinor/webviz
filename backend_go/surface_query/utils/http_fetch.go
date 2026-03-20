package utils

import (
	"fmt"
	"io"
	"net/http"
	"time"
)

// This shared client is used for all HTTP requests, allowing for connection reuse and better performance when fetching multiple blobs in succession.
// The key setting is MaxIdleConnsPerHost, which allows many idle connections to the same host and prevents the default limit of 2 from becoming a bottleneck.
var sharedHttpClient = &http.Client{
	Transport: &http.Transport{
		MaxIdleConnsPerHost: 50,
		MaxIdleConns:        100,
		ForceAttemptHTTP2:   true,
		IdleConnTimeout:     90 * time.Second,
	},
}

func GetBytesHTTP(url string) ([]byte, error) {
	res, err := sharedHttpClient.Get(url)
	if err != nil {
		return nil, err
	}

	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("http get returned status: %v", res.StatusCode)
	}

	bodyBytes, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	return bodyBytes, nil
}
