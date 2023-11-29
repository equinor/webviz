package xtgeo

import (
	utils "intersectTest/utils"
	"io"
	"math"
	"os"
	"testing"
)

func TestSurfaceZArrFromXYPairs(t *testing.T) {
	// Read test surface
	surface, err := ReadTestSurface("testdata/reek.gri")
	if err != nil {
		t.Errorf("Error reading test surface: %v", err)
	}
	xv_surf := []float32{461225.5035311932, 461279.6440995966, 461333.784668, 461387.9252364034, 461442.06580480695, 461496.20637321053, 461550.34694161406, 461604.4875100175, 461658.628078421,
		461712.76864682446, 461766.90921522805, 461821.04978363146, 461875.190352035, 461929.3309204385, 461983.471488842, 462037.6120572455, 462091.752625649, 462145.8931940525, 462200.03376245603,
		462254.17433085956, 462308.314899263, 462362.4554676665, 462416.59603607, 462470.7366044735, 462524.877172877, 462579.0177412805, 462633.15830968396, 462687.29887808743, 462741.4394464909}
	yv_surf := []float32{5932172.006023725, 5932079.265218862, 5931986.524414, 5931893.783609138, 5931801.042804276, 5931708.301999416, 5931615.561194555, 5931522.820389693, 5931430.07958483, 5931337.338779969,
		5931244.597975109, 5931151.857170247, 5931059.116365384, 5930966.375560524, 5930873.634755662, 5930780.8939508, 5930688.153145939, 5930595.412341077, 5930502.6715362165, 5930409.930731354,
		5930317.189926493, 5930224.449121631, 5930131.70831677, 5930038.967511908, 5929946.226707047, 5929853.485902186, 5929760.745097323, 5929668.004292461, 5929575.263487599}
	tests := []struct {
		name    string
		xv      []float32
		yv      []float32
		nx, ny  int
		xori    float32
		yori    float32
		xinc    float32
		yinc    float32
		yflip   int
		rotDeg  float32
		pMapV   []float32
		algo    InterpolationAlgorithm
		wantZv  []float32
		wantErr bool
	}{
		{
			name:   "NearestNode",
			xv:     xv_surf,
			yv:     yv_surf,
			nx:     int(surface.Nx),
			ny:     int(surface.Ny),
			xori:   surface.Xori,
			yori:   surface.Yori,
			xinc:   surface.Xinc,
			yinc:   surface.Yinc,
			yflip:  1,
			rotDeg: surface.Rot,
			pMapV:  surface.DataSlice,
			algo:   NearestNeighbor,
			wantZv: []float32{1685.0930141049964, 1687.9807578061243, 1691.3415700661026, 1695.6454473291408, 1695.6454473291408, 1696.7706841448226, 1696.7706841448226, 1695.643028359035, 1693.7654841855735,
				1693.7654841855735, 1684.2772626048697, 1685.3007968019667, 1685.3007968019667, 1691.2946213317985, 1686.6666589896238, 1692.671541883635, 1699.4305684525862, 1699.4305684525862, 1708.866493015498,
				1718.417415611136, 1718.417415611136, 1727.1870674278187, 1727.1870674278186, 1735.5974343992116, 1749.6485631247122, 1749.6485631247122, 1750.2167487516022, 1750.2167487516022, 1750.261157128011},
			wantErr: false,
		},
		{
			name:   "Bilinear",
			xv:     xv_surf,
			yv:     yv_surf,
			nx:     int(surface.Nx),
			ny:     int(surface.Ny),
			xori:   surface.Xori,
			yori:   surface.Yori,
			xinc:   surface.Xinc,
			yinc:   surface.Yinc,
			yflip:  1,
			rotDeg: surface.Rot,
			pMapV:  surface.DataSlice,
			algo:   Bilinear,
			wantZv: []float32{1686.1351629214669, 1688.2916895430124, 1691.0103396577106, 1694.0881669160685, 1696.1018787948876, 1696.88908061333, 1696.5747604443463, 1695.265858591502, 1692.3927627988246,
				1689.3878572195433, 1686.5723208042277, 1685.3742819666343, 1685.8952020689371, 1688.5090208340248, 1691.0924778777646, 1693.8254955237774, 1696.977024004315, 1700.9102019604532, 1705.623687539731,
				1712.2841762215244, 1719.713075383137, 1725.0363238241773, 1730.342903408989, 1735.9014165143049, 1744.3897823968362, 1749.6622351550575, 1749.8856463780571, 1749.9564160791024, 1749.8868074966226},
			wantErr: false,
		},
		{
			name:    "OutsideGrid",
			xv:      []float32{-1.0, 1.0, 2.0},
			yv:      []float32{-1.0, 1.0, 2.0},
			nx:      3,
			ny:      3,
			xori:    0.0,
			yori:    0.0,
			xinc:    1.0,
			yinc:    1.0,
			yflip:   1,
			rotDeg:  0.0,
			pMapV:   []float32{0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0},
			algo:    NearestNeighbor,
			wantZv:  []float32{Undef, 4.0, 8.0},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotZv, err := SurfaceZArrFromXYPairs(tt.xv, tt.yv, tt.nx, tt.ny, tt.xori, tt.yori, tt.xinc, tt.yinc, tt.yflip, tt.rotDeg, tt.pMapV, tt.algo)
			if (err != nil) != tt.wantErr {
				t.Errorf("SurfaceZArrFromXYPairs() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !almostEqualArray(gotZv, tt.wantZv) {
				t.Errorf("SurfaceZArrFromXYPairs() gotZv = %v, want %v", gotZv, tt.wantZv)
			}
		})
	}
}

func almostEqualArray(a, b []float32) bool {
	if len(a) != len(b) {
		return false
	}
	const floatEps = 1e-1
	for i := range a {
		if float32(math.Abs(float64(a[i]-b[i]))) > floatEps {
			return false
		}
	}
	return true
}

func ReadTestSurface(fileName string) (*utils.Surface, error) {

	file, err := os.Open(fileName)

	if err != nil {
		return nil, err
	}

	fileData, err := io.ReadAll(file)

	if err != nil {
		return nil, err
	}
	surface := &utils.Surface{}

	surface, err = utils.DeserializeBlobToSurface(fileData)

	return surface, nil
}
