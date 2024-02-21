package utils

import (
	"fmt"
	"surface_query/xtgeo"
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

// Download blob and deserialize to surface
func (bf BlobFetcher) FetchAsSurface(objectUuid string) (*xtgeo.Surface, error) {
	byteArr, err := bf.FetchAsBytes(objectUuid)
	if err != nil {
		return nil, err
	}

	surface, err := xtgeo.DeserializeBlobToSurface(byteArr)
	if err != nil {
		return nil, err
	}

	return surface, nil
}

func fetchBlobBytes(sasToken string, baseUrl string, objectUuid string) ([]byte, int, error) {

	blobUrl := baseUrl + "/" + objectUuid + "?" + sasToken

	bytesResp, statusCode, err := HttpGet(blobUrl)
	if err != nil {
		return nil, 500, err
	}

	return bytesResp, statusCode, nil

}
