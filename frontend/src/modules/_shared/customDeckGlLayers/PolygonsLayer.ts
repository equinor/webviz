import type { CompositeLayerProps, FilterContext, Layer, UpdateParameters } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import { GeoJsonLayer, TextLayer } from "@deck.gl/layers";
import { parseHex, type Rgb } from "culori";
import type { FeatureCollection, Geometry } from "geojson";

import type { PolygonData_api } from "@api";

import {
    calculateBackgroundColorForColor,
    createPolygonFeatureCollection,
    createTextLabelData,
    LabelPositionType,
    type PolygonFeatureProperties,
    type PolygonVisualizationSettings,
    type TextLabelData,
} from "../DataProviderFramework/visualization/deckgl/polygonUtils";

export type PolygonsLayerProps = {
    id: string;
    data: PolygonData_api[];
    visualizationSettings?: PolygonVisualizationSettings | null;
};

export class PolygonsLayer extends CompositeLayer<PolygonsLayerProps> {
    static layerName: string = "PolygonsLayer";
    private _polygonData: FeatureCollection<Geometry, PolygonFeatureProperties> | null = null;
    private _textData: TextLabelData[] = [];

    filterSubLayer(context: FilterContext): boolean {
        // Dont show labels when zoomed out (maybe reduce to -5?)
        if (context.layer.id.includes("labels")) {
            return context.viewport.zoom > -5;
        }
        return true;
    }

    updateState(params: UpdateParameters<Layer<PolygonsLayerProps & Required<CompositeLayerProps>>>): void {
        const { data, visualizationSettings } = params.props as PolygonsLayerProps;

        if (!data || data.length === 0) {
            this._polygonData = null;
            this._textData = [];
            return;
        }

        this._polygonData = createPolygonFeatureCollection(data);

        const labelPosition = visualizationSettings?.labelPosition || LabelPositionType.CENTROID;
        this._textData = createTextLabelData(data, labelPosition);
    }

    renderLayers(): Layer[] {
        const { visualizationSettings } = this.props;
        const rgbColor = visualizationSettings?.color ? (parseHex(visualizationSettings.color) as Rgb) : undefined;

        // Calculate colors with opacity
        const lineOpacity = Math.round((visualizationSettings?.lineOpacity ?? 1) * 255);
        const fillOpacity = Math.round((visualizationSettings?.fillOpacity ?? 0.5) * 255);

        const lineColor = rgbColor
            ? [rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255, lineOpacity]
            : [0, 0, 0, lineOpacity];

        const fillColor = rgbColor
            ? [rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255, fillOpacity]
            : [0, 0, 0, fillOpacity];

        const layers: Layer[] = [];

        // Polygon layer
        if (this._polygonData) {
            layers.push(
                new GeoJsonLayer(
                    this.getSubLayerProps({
                        id: "polygons",
                        data: this._polygonData,
                        filled: visualizationSettings?.fill ?? false,
                        getLineColor: lineColor,
                        getFillColor: fillColor,
                        lineWidthMinPixels: visualizationSettings?.lineThickness ?? 1,
                        parameters: {
                            depthTest: false,
                        },
                        pickable: true,
                    }),
                ),
            );
        }

        // Text labels layer - if enabled
        if (this._textData.length > 0 && visualizationSettings?.showLabels) {
            // Calculate label color
            const labelRgbColor = visualizationSettings?.labelColor
                ? (parseHex(visualizationSettings.labelColor) as Rgb)
                : ({ r: 1, g: 1, b: 1, mode: "rgb" } as Rgb); // Default to white
            const labelColor = [labelRgbColor.r * 255, labelRgbColor.g * 255, labelRgbColor.b * 255, 255];

            const backgroundRgbColor = calculateBackgroundColorForColor(labelRgbColor);
            const backgroundColor = [
                backgroundRgbColor.r * 255,
                backgroundRgbColor.g * 255,
                backgroundRgbColor.b * 255,
                150,
            ];

            layers.push(
                new TextLayer(
                    this.getSubLayerProps({
                        id: "labels",
                        data: this._textData,
                        pickable: false,
                        getColor: labelColor,
                        fontWeight: 400,
                        fontSettings: {
                            fontSize: 24,
                            sdf: true,
                        },

                        getSize: 12,
                        sdf: true,
                        sizeScale: 1,
                        sizeUnits: "pixels",
                        sizeMinPixels: 4,
                        sizeMaxPixels: 12,
                        getAlignmentBaseline: "center",
                        getTextAnchor: "middle",
                        getPosition: (d: TextLabelData) => d.coordinates,
                        getText: (d: TextLabelData) => d.name,
                        backgroundColor: backgroundColor,
                        backgroundPadding: [2, 1, 2, 1],
                        parameters: { depthTest: false },
                    }),
                ),
            );
        }

        return layers;
    }
}
