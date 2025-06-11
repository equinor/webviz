import type { FilterContext, LayersList, UpdateParameters } from "@deck.gl/core";
import { Layer } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { BoundingBox3D } from "@webviz/subsurface-viewer";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import { GetBoundingBox } from "@webviz/subsurface-viewer/dist/layers/wells/utils/spline";

export class AdvancedWellsLayer extends WellsLayer {
    static layerName: string = "WellsLayer";

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("names")) {
            return context.viewport.zoom > -2;
        }

        return true;
    }

    updateState(params: UpdateParameters<WellsLayer>): void {
        super.updateState(params);
        const { props, changeFlags } = params;
        if (props.reportBoundingBox && changeFlags.dataChanged) {
            props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }
    }

    private calcBoundingBox(): BoundingBox3D {
        if (!this.state.data) {
            return [0, 0, 0, 0, 0, 0];
        }

        return GetBoundingBox(this.state.data);
    }

    renderLayers(): LayersList {
        const layers = super.renderLayers();

        if (!Array.isArray(layers)) {
            return layers;
        }

        const colorsLayer = layers.find((layer) => {
            if (!(layer instanceof Layer)) {
                return false;
            }

            return layer.id.includes("colors");
        });

        if (!(colorsLayer instanceof GeoJsonLayer)) {
            return layers;
        }

        const newColorsLayer = new GeoJsonLayer({
            data: colorsLayer.props.data,
            pickable: true,
            stroked: false,
            positionFormat: colorsLayer.props.positionFormat,
            pointRadiusUnits: "meters",
            lineWidthUnits: "meters",
            pointRadiusScale: this.props.pointRadiusScale,
            lineWidthScale: this.props.lineWidthScale,
            getLineWidth: colorsLayer.props.getLineWidth,
            getPointRadius: colorsLayer.props.getPointRadius,
            lineBillboard: true,
            pointBillboard: true,
            parameters: colorsLayer.props.parameters,
            visible: colorsLayer.props.visible,
            id: "colors",
            lineWidthMinPixels: 1,
            lineWidthMaxPixels: 5,
            extensions: colorsLayer.props.extensions,
            getDashArray: colorsLayer.props.getDashArray,
            getLineColor: colorsLayer.props.getLineColor,
            getFillColor: colorsLayer.props.getFillColor,
            autoHighlight: true,
            onHover: () => {},
        });

        return [newColorsLayer, ...layers.filter((layer) => layer !== colorsLayer)];
    }
}
