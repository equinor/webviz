import type { FilterContext, LayersList, UpdateParameters } from "@deck.gl/core";
import { Layer } from "@deck.gl/core";
import type { GeoJsonLayerProps } from "@deck.gl/layers";
import { GeoJsonLayer } from "@deck.gl/layers";
import type { BoundingBox3D } from "@webviz/subsurface-viewer";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import { GetBoundingBox } from "@webviz/subsurface-viewer/dist/layers/wells/utils/spline";
import { SubLayerId } from "@webviz/subsurface-viewer/dist/layers/wells/wellsLayer";

export class AdjustedWellsLayer extends WellsLayer {
    static layerName: string = "AdjustedWellsLayer";

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

            return layer.id.includes(SubLayerId.COLORS);
        });

        if (!(colorsLayer instanceof GeoJsonLayer)) {
            return layers;
        }

        const newColorsLayer = new GeoJsonLayer(
            super.getSubLayerProps({
                ...colorsLayer.props,
                data: colorsLayer.props.data,
                pickable: true,
                stroked: true,
                // pointRadiusUnits: "meters",
                // lineWidthUnits: "meters",
                pointRadiusScale: this.props.pointRadiusScale,
                lineWidthScale: this.props.lineWidthScale,
                lineBillboard: true,
                pointBillboard: true,
                id: "colors",
                lineWidthMinPixels: 5,

                // lineWidthMaxPixels: 5,
                autoHighlight: true,
                onHover: () => {},
            } as GeoJsonLayerProps),
        );

        return [newColorsLayer, ...layers.filter((layer) => layer !== colorsLayer)];
    }
}
