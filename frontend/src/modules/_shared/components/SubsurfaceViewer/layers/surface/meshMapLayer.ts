import { MapLayer as ATMapLayer } from "@webviz/subsurface-viewer/dist/layers/";
import { MapLayerProps } from "@webviz/subsurface-viewer/dist/layers/";

type Frame = MapLayerProps["frame"];

export class MeshMapLayer {
    private id: string = "mesh-map-layer";
    private frame: Frame = {
        origin: [0, 0],
        increment: [0, 0],
        count: [0, 0],
        rotDeg: 0,
    };
    private meshData: number[] = [];
    private propertyData: number[] | null = null;
    private contours: [number, number] | null = null;
    private gridLines: boolean = false;
    private smoothShading: boolean = false;
    private material: boolean = false;
    private colorMin?: number;
    private colorMax?: number;
    private colorPaletteId: string = "Continuous";

    constructor(id?: string) {
        this.id = id || this.id;
    }

    public setFrame(frame: Frame) {
        this.frame = frame;
    }
    public setMeshData(meshData: number[]) {
        this.meshData = meshData;
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
    public setContours(contours: [number, number] | null) {
        this.contours = contours;
    }
    public setGridLines(gridLines: boolean) {
        this.gridLines = gridLines;
    }
    public setSmoothShading(smoothShading: boolean) {
        this.smoothShading = smoothShading;
    }
    public setMaterial(material: boolean) {
        this.material = material;
    }

    public getId() {
        return this.id;
    }
    public getLayer() {
        return new ATMapLayer({
            id: this.id,
            meshData: this.meshData,
            propertiesData: this.propertyData || undefined,
            frame: this.frame,
            contours: this.contours || [-1.0, -1.0],
            isContoursDepth: true,
            gridLines: this.gridLines,
            material: this.material,
            smoothShading: this.smoothShading,
            colorMapName: this.colorPaletteId,
            colorMapRange: this.colorMin && this.colorMax ? [this.colorMin, this.colorMax] : undefined,
        });
    }
}
