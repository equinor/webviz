import { ColormapLayer as ATColormapLayer } from "@webviz/subsurface-viewer/dist/layers/";

export type ColormapLayerData = {
    base64ImageString: string;
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    rotDeg: number;
    valueMin: number;
    valueMax: number;
};
export class ColormapLayer {
    private id: string = "color-map-layer";
    private bounds: [number, number, number, number] = [0, 0, 0, 0];
    private base64ImageString: string = "";
    private rotDeg: number = 0;
    private valueMin: number = 0;
    private valueMax: number = 0;
    private colorMin?: number;
    private colorMax?: number;
    private colorPaletteId: string = "";

    constructor(id?: string) {
        this.id = id || this.id;
    }

    public setData(data: ColormapLayerData) {
        this.base64ImageString = data.base64ImageString;
        this.bounds = [data.xMin, data.yMin, data.xMax, data.yMax];
        this.rotDeg = data.rotDeg;
        this.valueMin = data.valueMin;
        this.valueMax = data.valueMax;
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
        return new ATColormapLayer({
            id: this.id,
            image: `data:image/png;base64,${this.base64ImageString}`,
            bounds: this.bounds,
            rotDeg: this.rotDeg,
            valueRange: [this.valueMin, this.valueMax],
            colorMapRange: [this.colorMin ?? this.valueMin, this.colorMax ?? this.valueMax],
            colorMapName: this.colorPaletteId,
        });
    }
}
