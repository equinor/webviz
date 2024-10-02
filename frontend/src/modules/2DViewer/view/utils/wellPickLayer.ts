import { CompositeLayer } from "@deck.gl/core/typed";
// import { CollisionFilterExtension } from "@deck.gl/extensions/typed";
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

export class WellPicksLayer extends CompositeLayer<WellBorePicksLayerProps> {
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

        return [
            new GeoJsonLayer(
                this.getSubLayerProps({
                    id: "points",
                    data: pointsData,
                    // pointType: 'circle+text',
                    filled: true,
                    lineWidthMinPixels: 20,

                    parameters: {
                        depthTest: false,
                    },
                    depthTest: false,
                    pickable: true,
                    getText: (d: Feature) => d.properties?.wellBoreUwi,
                    // getFillColor: [100, 100, 100, 100],
                    getLineColor: [50, 50, 50],
                })
            ),

            new TextLayer(
                this.getSubLayerProps({
                    id: "text",
                    data: textData,
                    depthTest: false,
                    pickable: true,
                    getColor: [0, 0, 0],
                    getSize: 100,
                    sizeUnits: "meters",
                    sizeMaxPixels: 20,
                    getAlignmentBaseline: "top",
                    getTextAnchor: "middle",
                    getPixelOffset: [0, 10],
                    getPosition: (d: TextLayerData) => d.coordinates,
                    getText: (d: TextLayerData) => d.name,
                    // collisionEnabled: true,
                    // // getCollisionPriority: d => Math.log10(d.population),
                    // collisionTestProps: {
                    //     sizeScale: 32 * 2,
                    //     sizeMaxPixels: 30 * 2,
                    //     sizeMinPixels: 30 * 2,
                    // },
                    // extensions: [new CollisionFilterExtension()],
                })
            ),
        ];
    }
}
