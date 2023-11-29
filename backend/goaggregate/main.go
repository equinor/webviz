package main

import "C"
import (
	
	"encoding/json"
	"fmt"
	"encoding/base64"
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
    dataMapB64 := make(map[string]string)
    for id, blob := range dataMap {
        b64Str := base64.StdEncoding.EncodeToString(blob)
        dataMapB64[id] = b64Str
    }

    jsonData, err := json.Marshal(dataMapB64)
    if err != nil {
        // handle error
    }

    return C.CString(string(jsonData))
}

func main() {
}
