import { CompositeLayer, Layer, LayersList } from "@deck.gl/core";
import { ColumnLayer } from "@deck.gl/layers";

export type HoverPointLayerProps = {
    point: number[] | null;
    color: [number, number, number, number];
};

export class HoverPointLayer extends CompositeLayer<HoverPointLayerProps> {
    static layerName: string = "HoverPointLayer";

    renderLayers(): Layer | null | LayersList {
        if (!this.props.point) {
            return null;
        }

        return new ColumnLayer({
            id: "hover-point",
            data: [this.props.point],
            diskResolution: 20,
            getElevation: 1,
            radiusUnits: "pixels",
            radius: 20,
            extruded: false,
            pickable: false,
            getPosition: (d) => d,
            getFillColor: this.props.color,
        });
    }
}
