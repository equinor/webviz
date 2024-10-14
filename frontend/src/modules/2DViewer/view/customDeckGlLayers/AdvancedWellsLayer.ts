import { FilterContext, Layer, LayersList } from "@deck.gl/core/typed";
import { GeoJsonLayer } from "@deck.gl/layers/typed";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

export class AdvancedWellsLayer extends WellsLayer {
    constructor(props: any) {
        super(props);
    }

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("names")) {
            return context.viewport.zoom > -2;
        }

        return true;
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
        });

        return [newColorsLayer, ...layers.filter((layer) => layer !== colorsLayer)];
    }
}
