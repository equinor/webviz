package utils

import (
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
	byteArr, statusCode, err := fetchBlobBytes(bf.sasToken, bf.blobStoreBaseUri, objectUuid)
	if err != nil {
		return nil, err
	}
	if statusCode != 200 {
		return nil, fmt.Errorf("blob fetch returned http error: %v", statusCode)
	}

	return byteArr, nil
}

func fetchBlobBytes(sasToken string, baseUrl string, objectUuid string) ([]byte, int, error) {

	blobUrl := baseUrl + "/" + objectUuid + "?" + sasToken

	bytesResp, statusCode, err := HttpGet(blobUrl)
	if err != nil {
		return nil, 500, err
	}

	return bytesResp, statusCode, nil

}
