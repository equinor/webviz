import type { CompositeLayerProps, FilterContext, Layer, UpdateParameters } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import { GeoJsonLayer, TextLayer } from "@deck.gl/layers";
import type { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";
import type { Feature, FeatureCollection } from "geojson";

export type WellborePicksLayerData = {
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
    data: WellborePicksLayerData[];

    // Non-public property:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
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

    updateState({
        props,
        changeFlags,
    }: UpdateParameters<Layer<WellBorePicksLayerProps & Required<CompositeLayerProps>>>): void {
        if (props.reportBoundingBox && changeFlags.dataChanged) {
            props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }

        const features: Feature[] = props.data.map((wellPick) => {
            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [wellPick.easting, wellPick.northing, -wellPick.tvdMsl],
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
                coordinates: [wellPick.easting, wellPick.northing, -wellPick.tvdMsl],
                name: wellPick.wellBoreUwi,
            };
        });

        this._pointsData = pointsData;
        this._textData = textData;
    }

    private calcBoundingBox(): BoundingBox3D {
        let xmin = Number.POSITIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;
        let zmin = Number.POSITIVE_INFINITY;
        let xmax = Number.NEGATIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;
        let zmax = Number.NEGATIVE_INFINITY;

        for (const wellPick of this.props.data) {
            const easting = wellPick.easting;
            const northing = wellPick.northing;
            const tvdMsl = -wellPick.tvdMsl; // Invert Z for depth

            xmin = Math.min(xmin, easting);
            ymin = Math.min(ymin, northing);
            zmin = Math.min(zmin, tvdMsl);
            xmax = Math.max(xmax, easting);
            ymax = Math.max(ymax, northing);
            zmax = Math.max(zmax, tvdMsl);
        }

        return [xmin, ymin, zmin, xmax, ymax, zmax];
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
                }),
            ),

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
                }),
            ),
        ];
    }
}
