import { CompositeLayer, CompositeLayerProps, Layer, LayersList, UpdateParameters } from "@deck.gl/core";
import { BoundingBox3D } from "@webviz/subsurface-viewer";
import { WellsLayer, WellsLayerProps } from "@webviz/subsurface-viewer/dist/layers";

export type AdvancedWellsLayerProps = {
    boundingBox: BoundingBox3D;
} & WellsLayerProps;
export class AdvancedWellsLayer extends CompositeLayer<AdvancedWellsLayerProps> {
    static layerName: string = "AdvancedWellsLayer";

    updateState(params: UpdateParameters<Layer<AdvancedWellsLayerProps & Required<CompositeLayerProps>>>): void {
        super.updateState(params);

        const { boundingBox } = this.props;

        this.props.reportBoundingBox?.({
            layerBoundingBox: boundingBox,
        });
    }

    renderLayers(): LayersList {
        return [
            new WellsLayer({
                ...this.props,
                id: "wellslayer",
                data: this.props.data,
            }),
        ];
    }
}
