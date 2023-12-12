package utils

import (
	"C"
	"fmt"
)
import (
	"bytes"
	"encoding/binary"
	"errors"
	"sync"
)

const UndefinedSurfValue = float32(1e30)

func GetSurfaceDataFromBlobs(objectIds []string, sasToken string, baseUrl string, nanAsZero bool) ([]*Surface, []error) {
	var wg sync.WaitGroup
	dataSurfaces := make([]*Surface, len(objectIds))
	errorChan := make(chan error, len(objectIds))

	for index, objectId := range objectIds {
		wg.Add(1)
		go GetBlob(objectId, dataSurfaces, index, &wg, &sasToken, baseUrl, errorChan, nanAsZero)
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

	return dataSurfaces, errArray
}

func GetBlob(objectId string, surfaceList []*Surface, index int, wg *sync.WaitGroup, sasToken *string, baseUrl string, errorChannel chan<- error, nanAsZero bool) {
	defer wg.Done()
	bytesResp, statusCode, err := FetchBlob(objectId, baseUrl, sasToken)

	if err != nil {
		surfaceList[index] = nil
		errorChannel <- fmt.Errorf("objectId %v: %v", objectId, err.Error())
	}
	if statusCode == 200 {

		surfaceList[index], err = DeserializeBlobToSurface(bytesResp)
		if err != nil {
			errorChannel <- fmt.Errorf("objectId %v: %v", objectId, err.Error())
		}

		if nanAsZero {
			replaceNaNwithValue(surfaceList[index], 0)
		}

	} else {
		surfaceList[index] = nil
		errorChannel <- fmt.Errorf("objectId %v: status code %v not 200", objectId, statusCode)
	}
}

func replaceNaNwithValue(surface *Surface, value float32) {
	for i, val := range surface.DataSlice {
		if val == UndefinedSurfValue {
			surface.DataSlice[i] = value
		}
	}
}

func DeserializeBlobToSurface(blobBytes []byte) (*Surface, error) {
	var blobHeader IrapBinaryHeader
	headerBytes := blobBytes[:100]
	bodyBytes := blobBytes[100:]
	err := binary.Read(bytes.NewReader(headerBytes), binary.BigEndian, &blobHeader)
	if err != nil {
		fmt.Println("binary.Read failed:", err)
	}

	dataSlice := []float32{}
	databuffer := bytes.NewReader(bodyBytes)
	lineData := make([]float32, blobHeader.Nx)
	for i := 0; i < int(blobHeader.Ny); i++ {
		var startByte int32
		err = binary.Read(databuffer, binary.BigEndian, &startByte)
		if err != nil || startByte != (int32(blobHeader.Nx*4)) {
			return nil, errors.New("error when reading start-byte")
		}
		err = binary.Read(databuffer, binary.BigEndian, &lineData)
		if err != nil {
			return nil, err
		}

		var stopByte int32
		err = binary.Read(databuffer, binary.BigEndian, &stopByte)

		if err != nil || stopByte != (int32(blobHeader.Nx*4)) {
			return nil, errors.New("error when reading stop-byte")
		}

		dataSlice = append(dataSlice, lineData...)
	}

	return &Surface{
		Id_flag:   blobHeader.Id_flag,
		Xori:      blobHeader.Xori,
		Xmax:      blobHeader.Xmax,
		Yori:      blobHeader.Yori,
		Ymax:      blobHeader.Ymax,
		Xinc:      blobHeader.Xinc,
		Yinc:      blobHeader.Yinc,
		Nx:        blobHeader.Nx,
		Ny:        blobHeader.Ny,
		Rot:       blobHeader.Rot,
		X0ori:     blobHeader.X0ori,
		Y0ori:     blobHeader.Y0ori,
		DataSlice: dataSlice,
	}, nil
}

func FetchBlob(objectId string, baseUrl string, sasToken *string) ([]byte, int, error) {

	blobUrl := baseUrl + "/" + objectId + "?" + *sasToken

	bytesResp, statusCode, err := HttpGet(blobUrl)
	if err != nil {
		return nil, 500, err
	}

	return bytesResp, statusCode, nil

}

func AssignHeaderToDatavalues(surface *Surface, dataValues []float32) (Surface, error) {

	return Surface{
		Id_flag:   surface.Id_flag,
		Xori:      surface.Xori,
		Xmax:      surface.Xmax,
		Yori:      surface.Yori,
		Ymax:      surface.Ymax,
		Xinc:      surface.Xinc,
		Yinc:      surface.Yinc,
		Nx:        surface.Nx,
		Ny:        surface.Ny,
		Rot:       surface.Rot,
		X0ori:     surface.X0ori,
		Y0ori:     surface.Y0ori,
		DataSlice: dataValues,
	}, nil

}
