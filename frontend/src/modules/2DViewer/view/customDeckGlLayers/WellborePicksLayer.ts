import { CompositeLayer, CompositeLayerProps, FilterContext, Layer, UpdateParameters } from "@deck.gl/core";
import { GeoJsonLayer, TextLayer } from "@deck.gl/layers";

import type { Feature, FeatureCollection } from "geojson";

export type WellBorePickLayerData = {
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

export type WellBorePicksLayerProps = {
    id: string;
    data: WellBorePickLayerData[];
};

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

    updateState(params: UpdateParameters<Layer<WellBorePicksLayerProps & Required<CompositeLayerProps>>>): void {
        const features: Feature[] = params.props.data.map((wellPick) => {
            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [wellPick.easting, wellPick.northing],
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
                    // pointType: 'circle+text',
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
                    // extensions: [new CollisionFilterExtension()],
                    // collisionGroup: "wellbore-picks",
                })
            ),

            new TextLayer(
                this.getSubLayerProps({
                    id: "text",
                    data: this._textData,
                    // depthTest: true,
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
                    // maxWidth: 64 * 12,
                    /*
                    // extensions: [new CollisionFilterExtension()],
                    collisionGroup: "wellbore-picks",

                    collisionTestProps: {
                        sizeScale: fontSize,
                        sizeMaxPixels: sizeMaxPixels * 2,
                        sizeMinPixels: sizeMinPixels * 2,
                    },
                    */
                })
            ),
        ];
    }
}
