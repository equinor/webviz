package xtgeo

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
	Xori      float64
	Xmax      float64
	Yori      float64
	Ymax      float64
	Xinc      float64
	Yinc      float64
	Nx        int32
	Ny        int32
	Rot       float64
	X0ori     float64
	Y0ori     float64
	DataSlice []float32
}
