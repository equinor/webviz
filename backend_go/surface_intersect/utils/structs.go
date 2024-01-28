package utils

type BlobsRequest struct {
	ObjectIDs   []string `json:"object_ids"`
	BaseUri     string   `json:"base_uri"`
	AuthToken   string   `json:"auth_token"`
	BearerToken string   `json:"bearer_token"`
	Env         string   `json:"env"`
}

type RealizationObjectId struct {
	Realization int    `json:"realization" binding:"required"`
	ObjectUuid  string `json:"objectUuid" binding:"required"`
}

type PointSamplingRequest struct {
	AuthToken string                `json:"sasToken" binding:"required"`
	BaseUri   string                `json:"blobStoreBaseUri" binding:"required"`
	ObjectIds []RealizationObjectId `json:"objectIds" binding:"required"`
	XCoords   []float32             `json:"xCoords" binding:"required"`
	YCoords   []float32             `json:"yCoords" binding:"required"`
}

type RealizationSampleResult struct {
	Realization   int       `json:"realization" binding:"required"`
	SampledValues []float32 `json:"sampledValues" binding:"required"`
}

type PointSamplingResponse struct {
	SampleResultArr []RealizationSampleResult `json:"sampleResultArr" binding:"required"`
	UndefLimit      float32                   `json:"undefLimit" binding:"required"`
}
