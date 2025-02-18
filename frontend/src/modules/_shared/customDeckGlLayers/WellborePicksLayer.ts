import { CompositeLayer, CompositeLayerProps, FilterContext, Layer, UpdateParameters } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import { ExtendedLayerProps } from "@webviz/subsurface-viewer";
import { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";

import type { Feature, FeatureCollection } from "geojson";

export type WellborePickLayerData = {
    easting: number;
    northing: number;
    wellBoreUwi: string;
    tvdMsl: number;
    md: number;
    slotName: string;
};

type TextLayerData = {
    coordinates: [number, number, number];
    name: string;
};

export interface WellBorePicksLayerProps extends ExtendedLayerProps {
    id: string;
    data: WellborePickLayerData[];
    zIncreaseDownwards?: boolean;

    // Non public properties:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
}

export class WellborePicksLayer extends CompositeLayer<WellBorePicksLayerProps> {
    static layerName: string = "WellborePicksLayer";
    private _textData: TextLayerData[] = [];
    private _pointsData: FeatureCollection | null = null;

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("text")) {
            return context.viewport.zoom > -4;
        }

        return true;
    }

    private calcBoundingBox(): BoundingBox3D {
        const { data } = this.props;

        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let minZ = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;
        let maxZ = Number.MIN_VALUE;

        for (const wellPick of data) {
            minX = Math.min(minX, wellPick.easting);
            minY = Math.min(minY, wellPick.northing);
            minZ = Math.min(minZ, wellPick.tvdMsl);
            maxX = Math.max(maxX, wellPick.easting);
            maxY = Math.max(maxY, wellPick.northing);
            maxZ = Math.max(maxZ, wellPick.tvdMsl);
        }

        return [minX, minY, minZ, maxX, maxY, maxZ];
    }

    updateState(params: UpdateParameters<Layer<WellBorePicksLayerProps & Required<CompositeLayerProps>>>): void {
        const features: Feature[] = params.props.data.map((wellPick) => {
            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [wellPick.easting, wellPick.northing, wellPick.tvdMsl],
                },
                properties: {
                    name: `${wellPick.wellBoreUwi}, TVD_MSL: ${wellPick.tvdMsl}, MD: ${wellPick.md}`,
                    color: [100, 100, 100, 100],
                },
            };
        });

        const pointsData: FeatureCollection = {
            type: "FeatureCollection",
            features: features,
        };

        const textData: TextLayerData[] = this.props.data.map((wellPick) => {
            return {
                coordinates: [wellPick.easting, wellPick.northing, wellPick.tvdMsl],
                name: wellPick.wellBoreUwi,
            };
        });

        this._pointsData = pointsData;
        this._textData = textData;

        this.props.reportBoundingBox?.({
            layerBoundingBox: this.calcBoundingBox(),
        });
    }

    renderLayers() {
        const fontSize = 16;
        const sizeMinPixels = 16;
        const sizeMaxPixels = 16;

        return [
            new GeoJsonLayer(
                this.getSubLayerProps({
                    id: "points",
                    data: this._pointsData ?? undefined,
                    filled: true,
                    lineWidthMinPixels: 5,
                    lineWidthMaxPixels: 5,
                    lineWidthUnits: "meters",
                    parameters: {
                        depthTest: false,
                    },
                    getLineWidth: 1,
                    depthTest: false,
                    pickable: true,
                    getText: (d: Feature) => d.properties?.wellBoreUwi,
                    getLineColor: [50, 50, 50],
                })
            ),

            /*
            new TextLayer(
                this.getSubLayerProps({
                    id: "text",
                    data: this._textData,
                    pickable: true,
                    getColor: [255, 255, 255],
                    fontWeight: 800,
                    fontSettings: {
                        fontSize: fontSize * 2,
                        sdf: true,
                    },
                    outlineColor: [0, 0, 0],
                    outlineWidth: 2,
                    getSize: 12,
                    sdf: true,
                    sizeScale: fontSize,
                    sizeUnits: "meters",
                    sizeMinPixels: sizeMinPixels,
                    sizeMaxPixels: sizeMaxPixels,
                    getAlignmentBaseline: "top",
                    getTextAnchor: "middle",
                    getPosition: (d: TextLayerData) => d.coordinates,
                    getText: (d: TextLayerData) => d.name,
                    extensions: [
                        new CollisionFilterExtension({
                            collisionEnabled: true,
                        }),
                    ],
                })
            ),
            */
        ];
    }
}
