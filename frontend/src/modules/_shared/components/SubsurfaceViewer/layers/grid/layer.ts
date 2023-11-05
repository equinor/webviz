import { Grid3DLayer as ATGrid3DLayer } from "@webviz/subsurface-viewer/dist/layers/";

import { U } from "vitest/dist/reporters-qc5Smpt5";

export class Grid3DLayer {
    private id: string = "grid3d-layer";

    private points: Float32Array = new Float32Array();
    private polys: Uint32Array = new Uint32Array();
    private propertyData: number[] = [];

    private colorMin?: number;
    private colorMax?: number;
    private colorPaletteId: string = "Continuous";

    constructor(id?: string) {
        this.id = id || this.id;
    }

    public setData(points: Float32Array, polys: Uint32Array) {
        this.points = points;
        this.polys = polys;
    }
    public setPropertyData(propertyData: number[]) {
        this.propertyData = propertyData;
    }
    public setColorRange(min: number, max: number) {
        this.colorMin = min;
        this.colorMax = max;
    }
    public setColorPaletteId(id: string) {
        this.colorPaletteId = id;
    }

    public getId() {
        return this.id;
    }
    public getLayer() {
        return new ATGrid3DLayer({
            id: this.id,
            material: false,
            pointsData: this.points,
            polysData: this.polys,
            propertiesData: this.propertyData || [],
            colorMapName: this.colorPaletteId,
            ZIncreasingDownwards: false,
            colorMapRange: this.colorMin && this.colorMax ? [this.colorMin, this.colorMax] : undefined,
        });
    }
}
