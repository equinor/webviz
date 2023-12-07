package utils

import (
	"C"
	"fmt"
)
import (
	"archive/zip"
	"bytes"
	"encoding/binary"
	"errors"
	"log"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const UndefinedSurfValue = float32(1000000000000000000000000000000)

func CalculateAggregation(request *AggregateRequest) (map[string][]float32, *Surface, []error, error) {
	startTime := time.Now()
	surfaces, errArray := GetSurfaceDataFromBlobs(request.ObjectIDs, request.AuthToken, request.BaseUri, request.NaNasZero)

	elapsedTime := time.Since(startTime)
	log.Printf("Download took: %v\n\n", elapsedTime)

	for i, op := range request.Operation {
		request.Operation[i] = strings.ToLower(op)
	}

	var returnValues map[string][]float32
	startTimeAgg := time.Now()
	returnValues, err2 := CalculateSurfaces(surfaces, request.Operation)
	elapsedTimeAgg := time.Since(startTimeAgg)
	log.Printf("Aggregation took: %v\n\n", elapsedTimeAgg)

	if err2 != nil {
		fmt.Printf("calculate surfaces: %v", err2.Error())
		return nil, nil, nil, err2
	}

	var firstSurfaceNotNill *Surface
	for i, v := range surfaces {
		if v != nil {
			firstSurfaceNotNill = surfaces[i]
			break
		}
	}

	if request.OutPutZeroAsNaN {
		for _, values := range returnValues {
			for i, value := range values {
				if value == 0.0 {
					values[i] = UndefinedSurfValue
				}
			}
		}
	}

	elapsedTimeFull := time.Since(startTime)
	log.Printf("AggJob took: %v\n\n", elapsedTimeFull)

	return returnValues, firstSurfaceNotNill, errArray, nil
}

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

func SeparatePercentilesFromRest(operations []string) ([]string, []string) {
	var percentileOperations, otherOperations []string
	pAdded := false
	re, _ := regexp.Compile(`^(?i)p\d{1,2}?$`)
	for _, operation := range operations {
		if match := re.MatchString(operation); match {
			percentileOperations = append(percentileOperations, operation)
			if !pAdded {
				otherOperations = append(otherOperations, "p")
				pAdded = true
			}
		} else {
			otherOperations = append(otherOperations, operation)

		}
	}
	return percentileOperations, otherOperations
}

func CalculateSurfaces(surfaces []*Surface, operations []string) (map[string][]float32, error) {
	numElements, err := validateSurfacesLengths(surfaces)
	if err != nil {
		return nil, err
	}

	percentileOperations, otherOperations := SeparatePercentilesFromRest(operations)

	surfaceValuesMap := make(map[string][]float32)
	fmt.Printf("Number of elements: %v\n", numElements)
	for _, operation := range operations {
		surfaceValuesMap[operation] = make([]float32, numElements)
	}

	var wg sync.WaitGroup
	numMaxPartitions := 100
	numIndicesPerPartition := int(math.Round(float64(numElements) / float64(numMaxPartitions)))
	if numElements < numMaxPartitions {
		numIndicesPerPartition = 1
	}

	for _, otherOperation := range otherOperations {
		startIndex := 0
		for startIndex < numElements {
			endIndex := startIndex + numIndicesPerPartition - 1
			if endIndex >= numElements {
				endIndex = numElements - 1
			}
			wg.Add(1)
			switch otherOperation {
			case "mean":
				go GetMeanSurface(surfaces, startIndex, endIndex, surfaceValuesMap, &wg)
			case "min":
				go GetMinSurface(surfaces, startIndex, endIndex, surfaceValuesMap, &wg)
			case "max":
				go GetMaxSurface(surfaces, startIndex, endIndex, surfaceValuesMap, &wg)
			case "std":
				go GetStdSurface(surfaces, startIndex, endIndex, surfaceValuesMap, &wg)
			case "p":
				go GetPercentileSurface(surfaces, startIndex, endIndex, surfaceValuesMap, percentileOperations, &wg)
			default:
				return nil, fmt.Errorf("not a valid operation: %v", otherOperation)
			}
			startIndex += numIndicesPerPartition
		}
	}
	wg.Wait()

	return surfaceValuesMap, nil
}

func GetMeanSurface(surfaces []*Surface, startIndex, endIndex int, meanSurfaceValuesMap map[string][]float32, wg *sync.WaitGroup) {
	defer wg.Done()
	meanAtIndex := float32(0.0)

	for index := startIndex; index <= endIndex; index++ {
		total := float32(0.0)
		numValidSurfaceValues := float32(len(surfaces))
		for _, surface := range surfaces {
			var valueAtIndex float32
			if surface == nil || surface.DataSlice[index] >= UndefinedSurfValue {
				valueAtIndex = 0
				numValidSurfaceValues = numValidSurfaceValues - 1

			} else {
				valueAtIndex = surface.DataSlice[index]
			}

			total = total + valueAtIndex
		}
		if numValidSurfaceValues == 0 {
			meanAtIndex = UndefinedSurfValue
		} else {
			meanAtIndex = total / numValidSurfaceValues
		}
		meanSurfaceValuesMap["mean"][index] = meanAtIndex
	}
}

func GetMaxSurface(surfaces []*Surface, startIndex, endIndex int, maxSurfaceValuesMap map[string][]float32, wg *sync.WaitGroup) {
	defer wg.Done()
	for index := startIndex; index <= endIndex; index++ {
		maxVal := float32(-100000000000000000000)
		for _, surface := range surfaces {
			if surface == nil {
				continue
			}
			valueAtIndex := surface.DataSlice[index]
			if valueAtIndex > maxVal && valueAtIndex < 1000000 {
				maxVal = valueAtIndex
			}
		}
		if maxVal == -100000000000000000000 {
			maxVal = UndefinedSurfValue
		}
		maxSurfaceValuesMap["max"][index] = maxVal
	}
}

func GetMinSurface(surfaces []*Surface, startIndex, endIndex int, minSurfaceValuesMap map[string][]float32, wg *sync.WaitGroup) {
	defer wg.Done()
	for index := startIndex; index <= endIndex; index++ {
		minVal := UndefinedSurfValue
		for _, surface := range surfaces {
			if surface == nil {
				continue
			}
			valueAtIndex := surface.DataSlice[index]
			if valueAtIndex < minVal {
				minVal = valueAtIndex
			}
		}
		minSurfaceValuesMap["min"][index] = minVal
	}
}

func GetStdSurface(surfaces []*Surface, startIndex, endIndex int, stdSurfaceValuesMap map[string][]float32, wg *sync.WaitGroup) {
	defer wg.Done()
	x := float32(0.0)
	meanAtIndex := float32(0.0)
	meanSurfvalues := make([]float32, endIndex-startIndex+1)
	counterIndex := 0
	for index := startIndex; index <= endIndex; index++ {
		totalStd := float32(0.0)
		totalMean := float32(0.0)
		numValidSurfaceValues := float32(len(surfaces))

		for _, surface := range surfaces {
			var valueAtIndex float32
			if surface == nil || surface.DataSlice[index] >= UndefinedSurfValue {
				valueAtIndex = 0
				numValidSurfaceValues = numValidSurfaceValues - 1
			} else {
				valueAtIndex = surface.DataSlice[index]
			}

			totalMean = totalMean + valueAtIndex
		}
		if numValidSurfaceValues == 0 {
			meanAtIndex = UndefinedSurfValue
		} else {
			meanAtIndex = totalMean / numValidSurfaceValues
		}

		meanSurfvalues[counterIndex] = meanAtIndex

		numValidSurfaceValues = float32(len(surfaces))

		for _, surface := range surfaces {
			if surface == nil {
				x = 0
				numValidSurfaceValues = numValidSurfaceValues - 1
			} else {
				valueAtIndex := surface.DataSlice[index]
				if valueAtIndex >= UndefinedSurfValue {
					x = 0
					numValidSurfaceValues = numValidSurfaceValues - 1
				} else {
					meanvalueAtIndex := meanSurfvalues[counterIndex]
					x = float32(math.Pow((math.Abs(float64(valueAtIndex) - float64(meanvalueAtIndex))), 2))
				}
			}

			totalStd = totalStd + x

		}

		counterIndex++

		if numValidSurfaceValues == 0 {
			stdSurfaceValuesMap["std"][index] = UndefinedSurfValue
		} else {
			stdSurfaceValuesMap["std"][index] = float32(math.Sqrt(float64(totalStd / numValidSurfaceValues)))
		}

	}
}

func GetPercentileSurface(surfaces []*Surface, startIndex, endIndex int, percentileSurfaceValuesMap map[string][]float32, percentileOperations []string, wg *sync.WaitGroup) {
	defer wg.Done()
	surfaceSortValues := make([]float32, len(surfaces))
	for index := startIndex; index <= endIndex; index++ {
		numValidSurfaceValues := float32(len(surfaces))
		for i, surface := range surfaces {
			valueAtIndex := UndefinedSurfValue
			if surface != nil {
				valueAtIndex = surface.DataSlice[index]
			}
			if valueAtIndex >= UndefinedSurfValue {
				numValidSurfaceValues = numValidSurfaceValues - 1
			}

			surfaceSortValues[i] = valueAtIndex
		}

		if numValidSurfaceValues == 0 {
			for _, percentileOperation := range percentileOperations {
				percentileSurfaceValuesMap[percentileOperation][index] = UndefinedSurfValue
			}
		} else {
			sort.Slice(surfaceSortValues, func(i, j int) bool {
				return surfaceSortValues[i] < surfaceSortValues[j]
			})

			for _, percentileOperation := range percentileOperations {
				percentileFloat, _ := strconv.ParseFloat(strings.TrimPrefix(percentileOperation, "p"), 32)
				// Turns out oil industry calls the mathematical P10 for P90 and vice versa
				percentileFloat = 100 - percentileFloat
				pIndex := (numValidSurfaceValues - 1) * (float32(percentileFloat) / 100)
				lowPIndex := math.Floor(float64(pIndex))
				highPIndex := math.Ceil(float64(pIndex))

				percentileValue := surfaceSortValues[int(lowPIndex)] + ((pIndex - float32(lowPIndex)) * (surfaceSortValues[int(highPIndex)] - surfaceSortValues[int(lowPIndex)]))

				percentileSurfaceValuesMap[percentileOperation][index] = percentileValue
			}
		}
	}
}

func validateSurfacesLengths(surfaces []*Surface) (int, error) {
	if len(surfaces) == 0 {
		return -1, errors.New("surface error: no surface input")
	}

	firstSurfaceLength := -1

	for _, surface := range surfaces {
		if surface == nil {
			continue
		}
		if firstSurfaceLength == -1 {
			firstSurfaceLength = len(surface.DataSlice)
		}
		if len(surface.DataSlice) != firstSurfaceLength {
			return -1, errors.New("surface error: different surface sizes")
		}
		if int(surface.Nx*surface.Ny) != len(surface.DataSlice) {
			return -1, errors.New("surface error: len(Nx * Ny) not equal to len(DataSlice)")
		}
	}
	return firstSurfaceLength, nil
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

func SerializeSurfaceToBinary(surface *Surface) ([]byte, error) {
	if _, err := validateSurfacesLengths([]*Surface{surface}); err != nil {
		return nil, err
	}

	header := IrapBinaryHeader{
		StartRecord:  32,
		Id_flag:      surface.Id_flag,
		Ny:           surface.Ny,
		Xori:         surface.Xori,
		Xmax:         surface.Xmax,
		Yori:         surface.Yori,
		Ymax:         surface.Ymax,
		Xinc:         surface.Xinc,
		Yinc:         surface.Yinc,
		StopRecord:   32,
		StartRecord2: 16,
		Nx:           surface.Nx,
		Rot:          surface.Rot,
		X0ori:        surface.X0ori,
		Y0ori:        surface.Y0ori,
		StopRecord2:  16,
		StartRecord3: 28,
		DummyData0:   0,
		DummyData1:   0,
		DummyData2:   0,
		DummyData3:   0,
		DummyData4:   0,
		DummyData5:   0,
		DummyData6:   0,
		StopRecord3:  28,
	}

	buffer := new(bytes.Buffer)
	err := binary.Write(buffer, binary.BigEndian, header)
	if err != nil {
		return nil, errors.New("could not serialize surface header to binary")
	}
	chunkSize := surface.Nx
	nChunks := surface.Ny
	start := 0
	for i := 0; i < int(nChunks); i++ {
		err2 := binary.Write(buffer, binary.BigEndian, int32(chunkSize*4))
		err3 := binary.Write(buffer, binary.BigEndian, surface.DataSlice[start:(start+int(chunkSize))])
		err4 := binary.Write(buffer, binary.BigEndian, int32(chunkSize*4))

		if err2 != nil || err3 != nil || err4 != nil {
			return nil, errors.New("could not serialize surface body object to binary")
		}

		start += int(chunkSize)
	}
	return buffer.Bytes(), nil
}

func WriteToZip(resultValuesMap map[string][]float32, firstSurface *Surface) ([]byte, error) {
	buf := new(bytes.Buffer)
	zipWriter := zip.NewWriter(buf)
	for operation, returnValue := range resultValuesMap {
		returnSurface, _ := AssignHeaderToDatavalues(firstSurface, returnValue)
		returnStream, err := SerializeSurfaceToBinary(&returnSurface)
		if err != nil {
			log.Printf("serializing surface to binary: %v", err.Error())
			return nil, err
		}
		fileWriter, err := zipWriter.Create(operation)
		if err != nil {
			log.Printf("create zip: %v", err.Error())
			return nil, err
		}
		_, err = fileWriter.Write(returnStream)
		if err != nil {
			log.Printf("write zip: %v", err.Error())
			return nil, err
		}
	}
	zipWriter.Close()
	return buf.Bytes(), nil
}
