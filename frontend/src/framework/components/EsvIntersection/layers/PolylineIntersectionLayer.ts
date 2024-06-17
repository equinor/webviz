import {
    LayerOptions,
    OnRescaleEvent,
    OnUpdateEvent,
    PixiLayer,
    PixiRenderApplication,
} from "@equinor/esv-intersection";
import { ColorScale } from "@lib/utils/ColorScale";

import { Graphics } from "pixi.js";

import { polygonFromVerticesAndIndices } from "../utils/geometry";

export type FenceMeshSection = {
    verticesUzArr: Float32Array; // [u, z]
    polyIndicesArr: Uint32Array | Uint16Array | Uint8Array;
    verticesPerPolyArr: Uint32Array | Uint16Array | Uint8Array;
    polySourceCellIndicesArr: Uint32Array | Uint16Array | Uint8Array;
    polyPropsArr: Float32Array;
    sectionLength: number;
    minZ: number;
    maxZ: number;
};

export type PolylineIntersectionData = {
    fenceMeshSections: FenceMeshSection[];
    minGridPropValue: number;
    maxGridPropValue: number;
    gridDimensions: {
        cellCountI: number;
        cellCountJ: number;
        cellCountK: number;
    };
    extensionLengthStart?: number;
    hideGridlines?: boolean;
    colorScale: ColorScale;
    propertyName: string;
    propertyUnit: string;
};

type CellIndexPolygonsLookupMap = Map<number, { sectionIndex: number; polygonIndex: number; startOffset: number }[]>;

export type PolylineIntersectionLayerOptions = LayerOptions<PolylineIntersectionData>;
export class PolylineIntersectionLayer extends PixiLayer<PolylineIntersectionData> {
    private _isPreRendered = false;
    private _cellIndexPolygonsLookupMap: CellIndexPolygonsLookupMap = new Map();

    constructor(ctx: PixiRenderApplication, id: string, options: PolylineIntersectionLayerOptions) {
        super(ctx, id, options);
    }

    override onRescale(event: OnRescaleEvent): void {
        super.onRescale(event);

        if (!this._isPreRendered) {
            this.clearLayer();
            this.preRender();
        }

        this.render();
    }

    override onUpdate(event: OnUpdateEvent<PolylineIntersectionData>): void {
        super.onUpdate(event);

        this._isPreRendered = false;
        this.clearLayer();
        this.preRender();
        this.makeCellIndexPolygonsLookupMap();
        this.render();
    }

    preRender(): void {
        if (!this.data) {
            return;
        }

        // this.data?.colorScale.setRange(this.data.minGridPropValue, this.data.maxGridPropValue);

        const showGridlines = !(this.data?.hideGridlines ?? false);
        let startU = -(this.data?.extensionLengthStart ?? 0);
        this.data.fenceMeshSections.forEach((section) => {
            this.createFenceMeshSection(startU, section, showGridlines);
            startU += section.sectionLength;
        });

        this._isPreRendered = true;
    }

    createFenceMeshSection(offsetU: number, section: FenceMeshSection, showGridlines: boolean): void {
        const graphics = new Graphics();

        let indicesIndex = 0;
        for (let polygonIndex = 0; polygonIndex < section.verticesPerPolyArr.length; polygonIndex++) {
            const propValue = section.polyPropsArr[polygonIndex];

            // Values can be NaN by definition
            let color = "transparent";
            let alpha = 0.0;
            if (!Number.isNaN(propValue) && this.data) {
                alpha = 1.0;
                color = this.data?.colorScale.getColorForValue(propValue);
            }

            if (showGridlines) {
                graphics.lineStyle(0.2, "#000", 1);
            } else {
                graphics.lineStyle(0);
            }

            graphics.beginFill(color, alpha);
            const polySize = section.verticesPerPolyArr[polygonIndex];
            const polyVertices: number[] = [];
            for (let i = 0; i < polySize; i++) {
                const verticeIndex = section.polyIndicesArr[indicesIndex + i] * 2;
                const verticeU = section.verticesUzArr[verticeIndex];
                const verticeZ = section.verticesUzArr[verticeIndex + 1];
                polyVertices.push(offsetU + verticeU, verticeZ);
            }

            graphics.drawPolygon(polyVertices);
            graphics.endFill();

            indicesIndex += polySize;
        }

        this.addChild(graphics);
    }

    private makeCellIndexPolygonsLookupMap() {
        if (!this.data) {
            return;
        }

        this._cellIndexPolygonsLookupMap.clear();

        let startOffset = 0;
        for (const [sectionIndex, section] of this.data.fenceMeshSections.entries()) {
            for (let polygonIndex = 0; polygonIndex < section.polySourceCellIndicesArr.length; polygonIndex++) {
                const cellIndex = section.polySourceCellIndicesArr[polygonIndex];
                if (!this._cellIndexPolygonsLookupMap.has(cellIndex)) {
                    this._cellIndexPolygonsLookupMap.set(cellIndex, []);
                }

                this._cellIndexPolygonsLookupMap.get(cellIndex)?.push({ sectionIndex, polygonIndex, startOffset });
            }

            startOffset += section.sectionLength;
        }
    }

    extractPolygonsForCellIndex(cellIndex: number): number[][][] {
        const polygonsPoints: number[][][] = [];

        const polygons = this._cellIndexPolygonsLookupMap.get(cellIndex);
        if (!polygons || !this.data) {
            return [];
        }

        for (const { sectionIndex, polygonIndex, startOffset } of polygons) {
            const sectionData = this.data.fenceMeshSections[sectionIndex];
            const numVertices = sectionData.verticesPerPolyArr[polygonIndex];
            let firstVerticeIndex = 0;
            for (let i = 0; i < polygonIndex; i++) {
                firstVerticeIndex += sectionData.verticesPerPolyArr[i];
            }
            const polygonIndices = sectionData.polyIndicesArr.subarray(
                firstVerticeIndex,
                firstVerticeIndex + numVertices
            );

            let polygon = polygonFromVerticesAndIndices(startOffset, sectionData.verticesUzArr, polygonIndices);
            polygon = polygon.map((point) => [point[0] - (this.data?.extensionLengthStart ?? 0), point[1]]);

            polygonsPoints.push(polygon);
        }

        return polygonsPoints;
    }
}
