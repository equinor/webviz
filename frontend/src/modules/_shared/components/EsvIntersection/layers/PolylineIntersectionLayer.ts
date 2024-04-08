import {
    LayerOptions,
    OnRescaleEvent,
    OnUpdateEvent,
    PixiLayer,
    PixiRenderApplication,
} from "@equinor/esv-intersection";
import { ColorScale } from "@lib/utils/ColorScale";
import { pointDistance } from "@lib/utils/geometry";

import { Graphics } from "pixi.js";

export type FenceMeshSection = {
    verticesUzArr: Float32Array; // [u, z]
    polyIndicesArr: Uint32Array | Uint16Array | Uint8Array;
    verticesPerPolyArr: Uint32Array | Uint16Array | Uint8Array;
    polySourceCellIndicesArr: Uint32Array | Uint16Array | Uint8Array;
    polyPropsArr: Float32Array;
    startUtmX: number;
    startUtmY: number;
    endUtmX: number;
    endUtmY: number;
    minZ: number;
    maxZ: number;
};

export type PolylineIntersectionData = {
    fenceMeshSections: FenceMeshSection[];
    minGridPropValue: number;
    maxGridPropValue: number;
    hideGridlines?: boolean;
    colorScale: ColorScale;
};

export type PolylineIntersectionLayerOptions = LayerOptions<PolylineIntersectionData>;
export class PolylineIntersectionLayer extends PixiLayer<PolylineIntersectionData> {
    private _isPreRendered = false;

    constructor(ctx: PixiRenderApplication, id: string, options: PolylineIntersectionLayerOptions) {
        super(ctx, id, options);

        this.data?.colorScale.setRange(options.data?.minGridPropValue ?? 0, options.data?.maxGridPropValue ?? 1000);
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
        this.render();
    }

    preRender(): void {
        if (!this.data) {
            return;
        }

        this.data?.colorScale.setRange(this.data.minGridPropValue, this.data.maxGridPropValue);

        const showGridlines = !(this.data?.hideGridlines ?? false);
        let startU = 0;
        this.data.fenceMeshSections.forEach((section) => {
            this.createFenceMeshSection(startU, section, showGridlines);
            const uVectorLength = pointDistance(
                {
                    x: section.startUtmX,
                    y: section.startUtmY,
                },
                {
                    x: section.endUtmX,
                    y: section.endUtmY,
                }
            );
            startU += uVectorLength;
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
            if (!Number.isNaN(propValue) && this.data) {
                color = this.data?.colorScale.getColorForValue(propValue);
            }

            if (showGridlines) {
                graphics.lineStyle(0.2, "#000", 1);
            } else {
                graphics.lineStyle(0);
            }

            graphics.beginFill(color, 1.0);
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
}
