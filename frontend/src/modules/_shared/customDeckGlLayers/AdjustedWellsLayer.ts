import type { FilterContext, LayersList, UpdateParameters } from "@deck.gl/core";
import { Layer } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { BoundingBox3D } from "@webviz/subsurface-viewer";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import { GetBoundingBox } from "@webviz/subsurface-viewer/dist/layers/wells/utils/spline";

export class AdjustedWellsLayer extends WellsLayer {
    static layerName: string = "AdjustedWellsLayer";

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("names")) {
            return context.viewport.zoom > -2;
        }

        return true;
    }

    updateState(params: UpdateParameters<WellsLayer>): void {
        const { props, changeFlags } = params;
        if (props.reportBoundingBox && changeFlags.dataChanged) {
            props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }
        super.updateState(params);
    }

    private calcBoundingBox(): BoundingBox3D {
        if (!this.state.data) {
            return [0, 0, 0, 0, 0, 0];
        }

        const bbox = GetBoundingBox(this.state.data);
        console.debug("AdjustedWellsLayer bounding box", bbox);
        return bbox;
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

        const newColorsLayer = new GeoJsonLayer(
            super.getSubLayerProps({
                ...colorsLayer.props,
                data: colorsLayer.props.data,
                pickable: true,
                stroked: false,
                pointRadiusUnits: "meters",
                lineWidthUnits: "meters",
                pointRadiusScale: this.props.pointRadiusScale,
                lineWidthScale: this.props.lineWidthScale,
                lineBillboard: true,
                pointBillboard: true,
                id: "colors",
                lineWidthMinPixels: 1,
                lineWidthMaxPixels: 5,
                autoHighlight: true,
                onHover: () => {},
            }),
        );

        return [newColorsLayer, ...layers.filter((layer) => layer !== colorsLayer)];
    }
}
