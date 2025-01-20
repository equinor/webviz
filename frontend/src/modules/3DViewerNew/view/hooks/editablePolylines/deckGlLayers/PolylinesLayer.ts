import { CompositeLayer, Layer, PickingInfo } from "@deck.gl/core";
import { PathLayer } from "@deck.gl/layers";

import { Polyline } from "../types";

export type PolylinesLayerProps = {
    id: string;
    polylines: Polyline[];
};

export class PolylinesLayer extends CompositeLayer<PolylinesLayerProps> {
    static layerName: string = "PolylinesLayer";

    // @ts-expect-error
    state!: {
        hoveredPolylineIndex: number | null;
    };

    onHover(info: PickingInfo, pickingEvent: any): boolean {
        if (!info.object) {
            return false;
        }

        const hoveredPolylineIndex = this.props.polylines[info.index];
        this.setState({ hoveredPolylineIndex });

        return false;
    }

    renderLayers(): Layer[] {
        const { hoveredPolylineIndex } = this.state;

        const layers: Layer[] = [
            new PathLayer({
                id: `polylines`,
                data: this.props.polylines,
                getPath: (d) => d.polyline,
                getColor: (d: Polyline) => d.color,
                getWidth: 2,
            }),
        ];

        if (hoveredPolylineIndex !== null && this.props.polylines[hoveredPolylineIndex]) {
            layers.push(
                new PathLayer({
                    id: `hovered`,
                    data: [this.props.polylines[hoveredPolylineIndex]],
                    getPath: (d) => d.polyline,
                    getColor: [255, 255, 255, 255],
                    getWidth: 4,
                })
            );
        }

        return layers;
    }
}
