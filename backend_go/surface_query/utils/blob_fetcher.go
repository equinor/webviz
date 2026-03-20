package utils

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
	blobUrl := bf.blobStoreBaseUri + "/" + objectUuid + "?" + bf.sasToken

	byteArr, err := GetBytesHTTP(blobUrl)
	if err != nil {
		return nil, err
	}

	return byteArr, nil
}
