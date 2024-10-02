import { CompositeLayer } from "@deck.gl/core/typed";
// import { CollisionFilterExtension } from "@deck.gl/extensions/typed";
import { GeoJsonLayer, TextLayer } from "@deck.gl/layers/typed";

export type WellBorePickLayerData = {
    easting: number;
    northing: number;
    wellBoreUwi: string;
    tvdMsl: number;
};
type TextLayerData = {
    coordinates: [number, number, number];
    name: string;
};
export type WellBorePicksLayerProps = {
    data: WellBorePickLayerData[];
};
export class WellPicksLayer extends CompositeLayer<WellBorePicksLayerProps> {
    renderLayers() {
        const features: Record<string, unknown>[] = this.props.data.map((wellPick) => {
            return {
                type: "Feature",
                geometry: {
                    type: "GeometryCollection",
                    geometries: [
                        { type: "Point", coordinates: [wellPick.easting, wellPick.northing, wellPick.tvdMsl] },
                    ],
                },
            };
        });
        const pointsData: Record<string, unknown> = {
            type: "FeatureCollection",
            unit: "m",
            features: features,
        };
        const textData: TextLayerData[] = this.props.data.map((wellPick) => {
            return {
                coordinates: [wellPick.easting, wellPick.northing, wellPick.tvdMsl],
                name: wellPick.wellBoreUwi,
            };
        });

        return [
            new GeoJsonLayer({
                data: pointsData,
                filled: true,
                lineWidthMinPixels: 20,

                parameters: {
                    depthTest: false,
                },
                depthTest: false,
                pickable: true,
            }),

            new TextLayer({
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
            }),
        ];
    }
}
