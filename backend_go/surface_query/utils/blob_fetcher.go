package utils

import (
	"context"
	"fmt"
)

type BlobFetcher struct {
	sasToken         string
	blobStoreBaseUri string
}

func NewBlobFetcher(sasToken string, blobStoreBaseUri string) *BlobFetcher {
	fetcher := BlobFetcher{sasToken, blobStoreBaseUri}
	return &fetcher
}

// Download blob as bytes
func (bf BlobFetcher) FetchAsBytes(objectUuid string) ([]byte, error) {
	return bf.FetchAsBytesWithContext(context.Background(), objectUuid)
}

// Context-aware downloading of blob as bytes
func (bf BlobFetcher) FetchAsBytesWithContext(ctx context.Context, objectUuid string) ([]byte, error) {
	blobUrl := bf.blobStoreBaseUri + "/" + objectUuid + "?" + bf.sasToken

	byteArr, err := GetBytesHTTP(ctx, blobUrl)
	if err != nil {
		return nil, fmt.Errorf("fetch blob %s failed: %w", objectUuid, err)
	}

	return byteArr, nil
}
