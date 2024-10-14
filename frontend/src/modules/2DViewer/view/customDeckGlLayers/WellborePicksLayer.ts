import { CompositeLayer, FilterContext } from "@deck.gl/core/typed";
import { CollisionFilterExtension } from "@deck.gl/extensions/typed";
import { GeoJsonLayer, TextLayer } from "@deck.gl/layers/typed";

import type { Feature, FeatureCollection } from "geojson";

export type WellBorePickLayerData = {
    easting: number;
    northing: number;
    wellBoreUwi: string;
    tvdMsl: number;
    md: number;
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
    filterSubLayer(context: FilterContext): boolean {
        return true;
        if (context.layer.id.includes("text")) {
            return context.viewport.zoom > -4;
        }

        return true;
    }

    renderLayers() {
        const features: Feature[] = this.props.data.map((wellPick) => {
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

        const fontSize = 12;
        const sizeMinPixels = 12;
        const sizeMaxPixels = 12;

        return [
            new GeoJsonLayer(
                this.getSubLayerProps({
                    id: "points",
                    data: pointsData,
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
                    collisionGroup: "wellbore-picks",
                })
            ),

            new TextLayer(
                this.getSubLayerProps({
                    id: "text",
                    data: textData,
                    depthTest: true,
                    pickable: true,
                    getColor: [0, 0, 0],
                    fontSettings: {
                        fontSize: fontSize * 2,
                        sdf: true,
                    },
                    outlineColor: [255, 255, 255],
                    outlineWidth: 3,
                    getSize: 10,
                    sizeScale: fontSize,
                    sizeUnits: "meters",
                    sizeMinPixels: sizeMinPixels,
                    sizeMaxPixels: sizeMaxPixels,
                    getAlignmentBaseline: "top",
                    getTextAnchor: "middle",
                    getPosition: (d: TextLayerData) => d.coordinates,
                    getText: (d: TextLayerData) => d.name,
                    // maxWidth: 64 * 12,
                    extensions: [new CollisionFilterExtension()],
                    collisionGroup: "wellbore-picks",

                    collisionTestProps: {
                        sizeScale: fontSize * 2,
                        sizeMaxPixels: sizeMaxPixels * 2,
                        sizeMinPixels: sizeMinPixels * 2,
                    },
                })
            ),
        ];
    }
}
