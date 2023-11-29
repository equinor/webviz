package utils


type BlobsRequest struct {
	ObjectIDs        []string `json:"object_ids"`
	BaseUri          string   `json:"base_uri"`
	AuthToken        string   `json:"auth_token"`
	BearerToken      string   `json:"bearer_token"`
	Env              string   `json:"env"`
}
