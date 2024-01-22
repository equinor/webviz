package utils

func FetchBlob(objectId string, baseUrl string, sasToken *string) ([]byte, int, error) {

	blobUrl := baseUrl + "/" + objectId + "?" + *sasToken

	bytesResp, statusCode, err := HttpGet(blobUrl)
	if err != nil {
		return nil, 500, err
	}

	return bytesResp, statusCode, nil

}
