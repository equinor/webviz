package utils

import (
	"C"
	"fmt"
)
import (
	"archive/zip"
	"bytes"
	"sync"
)
const UndefinedSurfValue = float32(1000000000000000000000000000000)

func GetBlobsRaw(objectIds []string, sasToken string, baseUrl string) (map[string][]byte, []error) {
    var wg sync.WaitGroup
    dataMap := make(map[string][]byte)
    errorChan := make(chan error, len(objectIds))

    // Mutex for safely updating the dataMap from multiple goroutines
    var mutex sync.Mutex

    for _, objectId := range objectIds {
        wg.Add(1)
        go GetBlobRaw(objectId, dataMap, &wg, &mutex, &sasToken, baseUrl, errorChan)
    }

    go func() {
        wg.Wait()
        close(errorChan)
    }()

    var errArray []error
    for err := range errorChan {
        errArray = append(errArray, err)
    }

    fmt.Printf("errArray length: %v\n", len(errArray))
    return dataMap, errArray
}

func GetBlobRaw(objectId string, dataMap map[string][]byte, wg *sync.WaitGroup, mutex *sync.Mutex, sasToken *string, baseUrl string, errorChannel chan<- error) {
    defer wg.Done()
    bytesResp, statusCode, err := FetchBlob(objectId, baseUrl, sasToken)

    mutex.Lock()
    defer mutex.Unlock()

    if err != nil {
        dataMap[objectId] = nil
        errorChannel <- fmt.Errorf("objectId %v: %v", objectId, err.Error())
        return
    }

    if statusCode == 200 {
        dataMap[objectId] = bytesResp
    } else {
        dataMap[objectId] = nil
        errorChannel <- fmt.Errorf("objectId %v: status code %v not 200", objectId, statusCode)
    }
}

func ZipData(dataMap map[string][]byte) ([]byte, error) {
    buf := new(bytes.Buffer) 
    w := zip.NewWriter(buf)
    for filename, data := range dataMap {
        
        f, err := w.Create(filename)
        if err != nil {
            return nil, fmt.Errorf("failed to create entry for %s in zip file: %v", filename, err)
        }
          
        _, err = f.Write(data)
        if err != nil {
            return nil, fmt.Errorf("failed to write data for %s to zip file: %v", filename, err)
        }
    } 
    err := w.Close()
    if err != nil {
        return nil, fmt.Errorf("failed to close zip writer: %v", err)
    }

    return buf.Bytes(), nil
}


func FetchBlob(objectId string, baseUrl string, sasToken *string) ([]byte, int, error) {

	blobUrl := baseUrl + "/" + objectId + "?" + *sasToken

	bytesResp, statusCode, err := HttpGet(blobUrl)
	if err != nil {
		return nil, 500, err
	}
	return bytesResp, statusCode, nil

}
