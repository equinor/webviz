import {
    CompositeLayer,
    type GetPickingInfoParams,
    type LayersList,
    type Material,
    type PickingInfo,
    type UpdateParameters,
} from "@deck.gl/core";
import type { ExtendedLayerProps, LayerPickInfo } from "@webviz/subsurface-viewer";
import type { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";

import * as vec3 from "@lib/utils/vec3";

import { type PipeLayerProps, PipesLayer } from "./_private/PipeLayer";
import { getMd } from "./_private/wellTrajectoryUtils";

export type WellsLayerData = {
    coordinates: [number, number, number][];
    properties: { uuid: string; name: string; mdArray: number[] };
}[];

export interface WellsLayerProps extends ExtendedLayerProps {
    id: string;
    data: WellsLayerData;
    zIncreaseDownwards?: boolean;

    boundingBox: BoundingBox3D;

    // Non public properties:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
}

const MATERIAL: Material = {
    ambient: 0.2,
    diffuse: 0.6,
    shininess: 132,
    specularColor: [255, 255, 255],
};

export class WellsLayer extends CompositeLayer<WellsLayerProps> {
    static layerName: string = "WellsLayer";

    // @ts-expect-error - This is how deck.gl expects the state to be defined
    state!: {
        hoveredPipeIndex: number | null;
        pipesLayerData: PipeLayerProps["data"];
    };

    initializeState(): void {
        this.setState({
            hoveredPipeIndex: null,
            pipesLayerData: [],
        });
    }

    shouldUpdateState({ changeFlags }: UpdateParameters<WellsLayer>): boolean {
        return changeFlags.dataChanged !== false;
    }

    updateState(params: UpdateParameters<WellsLayer>): void {
        super.updateState(params);

        const { boundingBox } = this.props;

        if (params.changeFlags.dataChanged) {
            const pipesLayerData = this.props.data.map((well) => {
                return {
                    id: well.properties.uuid,
                    centerLinePath: well.coordinates.map((coord) => {
                        return { x: coord[0], y: coord[1], z: coord[2] };
                    }),
                };
            });

            this.setState({ pipesLayerData });
        }

        this.props.reportBoundingBox?.({
            layerBoundingBox: boundingBox,
        });
    }

    getPickingInfo({ info }: GetPickingInfoParams): LayerPickInfo {
        if (!info.sourceLayer?.id.includes("pipes-layer")) {
            return info;
        }

        const wellbore = this.props.data[info.index];
        if (!wellbore) {
            return info;
        }
        info.object = this.props.data[info.index];

        const coordinate = info.coordinate ?? [0, 0, 0];

        const trajectory = wellbore.coordinates.map((coord) => vec3.fromArray(coord));

        const md = getMd(vec3.fromArray(coordinate), wellbore.properties.mdArray, trajectory);

        if (md !== null) {
            return {
                ...info,
                properties: [
                    {
                        name: `MD ${wellbore.properties.name}`,
                        value: md,
                    },
                ],
            };
        }

        return info;
    }

    onHover(info: PickingInfo): boolean {
        if (!info.sourceLayer) {
            return false;
        }

        const { sourceLayer } = info;
        if (sourceLayer.id !== "hover-path-layer") {
            return false;
        }

        const { index } = info;
        this.setState({ hoveredPipeIndex: index });
        return false;
    }

    renderLayers(): LayersList {
        const { pipesLayerData } = this.state;
        return [
            new PipesLayer({
                id: "pipes-layer",
                data: pipesLayerData,
                material: MATERIAL,
                pickable: true,
                // @ts-expect-error - This is how deck.gl expects the state to be defined
                parameters: { depthTest: true },
            }),
        ];
    }
}
