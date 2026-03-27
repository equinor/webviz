package utils

import (
	"context"
	"errors"
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

func GetBytesHTTP(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	res, err := sharedHttpClient.Do(req)
	if err != nil {
		switch {
		case errors.Is(err, context.Canceled):
			return nil, fmt.Errorf("http request canceled by context: %w", err)
		case errors.Is(err, context.DeadlineExceeded):
			return nil, fmt.Errorf("http request exceeded context deadline: %w", err)
		default:
			return nil, fmt.Errorf("http request failed: %w", err)
		}
	}

	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("http get returned status: %v", res.StatusCode)
	}

	bodyBytes, err := io.ReadAll(res.Body)
	if err != nil {
		switch {
		case errors.Is(err, context.Canceled):
			return nil, fmt.Errorf("http read canceled by context: %w", err)
		case errors.Is(err, context.DeadlineExceeded):
			return nil, fmt.Errorf("http read exceeded context deadline: %w", err)
		default:
			return nil, fmt.Errorf("http read failed: %w", err)
		}
	}

	return bodyBytes, nil
}
