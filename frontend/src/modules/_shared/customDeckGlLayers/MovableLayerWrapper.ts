import { CompositeLayer, GetPickingInfoParams, Layer, LayersList, PickingInfo } from "@deck.gl/core";

import { DragDirection } from "./DragHandleLayer";

export type MovableLayerWrapperProps<TLayer extends Layer<TProps>, TProps extends Record<string, unknown>> = {
    wrappedLayer: TLayer;
    draggable?: boolean;
    dragDirection?: DragDirection;
};

export type MovableLayerPickingInfo = {
    isMovable: boolean;
} & PickingInfo;

export class MovableLayerWrapper<
    TLayer extends Layer<TProps>,
    TProps extends Record<string, unknown>
> extends CompositeLayer<MovableLayerWrapperProps<TLayer, TProps>> {
    static layerName: string = "MovableLayerWrapper";

    getPickingInfo({ info }: GetPickingInfoParams): MovableLayerPickingInfo {
        const { wrappedLayer } = this.props;
        return {
            ...info,
            layer: wrappedLayer,
            isMovable: true,
        };
    }

    renderLayers(): Layer | null | LayersList {
        const { wrappedLayer } = this.props;
        return wrappedLayer;
    }
}
