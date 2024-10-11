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
            ...colorsLayer.props,
            id: "colors2",
            lineWidthMinPixels: 2,
            lineWidthUnits: "pixels",
        });

        return [newColorsLayer, ...layers.filter((layer) => layer !== colorsLayer)];
    }
}
