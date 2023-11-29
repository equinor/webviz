package main

import "C"
import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	goaggregate "goaggregate/utils"
)

//export GetZippedBlobs
func GetZippedBlobs(request *C.char) *C.char {
	requestString := C.GoString(request)
	aggReq := goaggregate.BlobsRequest{}
	err := json.Unmarshal([]byte(requestString), &aggReq)
	if err != nil {
		fmt.Println(err)
	}

	dataMap, errArray := goaggregate.GetBlobsRaw(aggReq.ObjectIDs, aggReq.AuthToken, aggReq.BaseUri)
	if len(errArray) > 0 {
		// Handle errors
	}	
	zipBytes, err := goaggregate.ZipData(dataMap)
	if err != nil {
		fmt.Errorf("Error writing result surfaces to zip: %v", err.Error())
	}
	return C.CString(hex.EncodeToString(zipBytes))	
}

func main() {
}
