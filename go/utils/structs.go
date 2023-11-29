package utils

type BlobsRequest struct {
	ObjectIDs   []string `json:"object_ids"`
	BaseUri     string   `json:"base_uri"`
	AuthToken   string   `json:"auth_token"`
	BearerToken string   `json:"bearer_token"`
	Env         string   `json:"env"`
}

type IrapBinaryHeader struct {
	StartRecord  int32
	Id_flag      int32
	Ny           int32
	Xori         float32
	Xmax         float32
	Yori         float32
	Ymax         float32
	Xinc         float32
	Yinc         float32
	StopRecord   int32
	StartRecord2 int32
	Nx           int32
	Rot          float32
	X0ori        float32
	Y0ori        float32
	StopRecord2  int32
	StartRecord3 int32
	DummyData0   int32
	DummyData1   int32
	DummyData2   int32
	DummyData3   int32
	DummyData4   int32
	DummyData5   int32
	DummyData6   int32
	StopRecord3  int32
}

type Surface struct {
	Id_flag   int32
	Xori      float32
	Xmax      float32
	Yori      float32
	Ymax      float32
	Xinc      float32
	Yinc      float32
	Nx        int32
	Ny        int32
	Rot       float32
	X0ori     float32
	Y0ori     float32
	DataSlice []float32
}
type AggregateRequest struct {
	Operation        []string `json:"operation"`
	ObjectIDs        []string `json:"object_ids"`
	BaseUri          string   `json:"base_uri"`
	AuthToken        string   `json:"auth_token"`
	NaNasZero        bool     `json:"nan_as_zero"`
	OutPutZeroAsNaN  bool     `json:"output_zero_as_nan"`
	BearerToken      string   `json:"bearer_token"`
	RelativeFilePath string   `json:"relative_file_path"`
	Env              string   `json:"env"`
}
type IntersectRequest struct {
	Xcoords   []float32 `json:"xcoords"`
	Ycoords   []float32 `json:"ycoords"`
	ObjectIDs []string  `json:"object_ids"`
	BaseUri   string    `json:"base_uri"`
	AuthToken string    `json:"auth_token"`
	Env       string    `json:"env"`
}
