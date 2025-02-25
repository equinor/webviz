import { CompositeLayer, LayersList } from "@deck.gl/core";
import { ExtendedLayerProps } from "@webviz/subsurface-viewer";
import { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";

import { PipeLayer } from "./_private/PipeLayer";

export type WellsLayerData = {
    coordinates: [number, number, number][];
    properties: { uuid: string; name: string };
}[];

export interface WellsLayerProps extends ExtendedLayerProps {
    id: string;
    data: WellsLayerData;
    zIncreaseDownwards?: boolean;

    boundingBox: BoundingBox3D;

    // Non public properties:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
}

export class WellsLayer extends CompositeLayer<WellsLayerProps> {
    static layerName: string = "WellsLayer";

    updateState(params: any): void {
        super.updateState(params);

        const { boundingBox } = this.props;

        this.props.reportBoundingBox?.({
            layerBoundingBox: boundingBox,
        });
    }

    renderLayers(): LayersList {
        return [
            new PipeLayer({
                id: "pipelayer",
                data: this.props.data.map((well) => {
                    return well.coordinates.map((coord) => {
                        return { x: coord[0], y: coord[1], z: coord[2] };
                    });
                }),
                material: true,
            }),
        ];
    }
}
