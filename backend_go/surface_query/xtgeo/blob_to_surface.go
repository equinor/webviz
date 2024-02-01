package xtgeo

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
)

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
		Xori:      float64(blobHeader.Xori),
		Xmax:      float64(blobHeader.Xmax),
		Yori:      float64(blobHeader.Yori),
		Ymax:      float64(blobHeader.Ymax),
		Xinc:      float64(blobHeader.Xinc),
		Yinc:      float64(blobHeader.Yinc),
		Nx:        blobHeader.Nx,
		Ny:        blobHeader.Ny,
		Rot:       float64(blobHeader.Rot),
		X0ori:     float64(blobHeader.X0ori),
		Y0ori:     float64(blobHeader.Y0ori),
		DataSlice: dataSlice,
	}, nil
}
