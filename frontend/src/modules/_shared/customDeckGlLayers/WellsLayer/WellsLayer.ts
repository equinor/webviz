import { CompositeLayer, GetPickingInfoParams, LayersList, PickingInfo } from "@deck.gl/core";
import { PathLayer, PointCloudLayer } from "@deck.gl/layers";
import * as vec3 from "@lib/utils/vec3";
import { ExtendedLayerProps, LayerPickInfo } from "@webviz/subsurface-viewer";
import { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";

import { PipeLayer } from "./_private/PipeLayer";
import { getCoordinateForMd, getMd } from "./_private/wellTrajectoryUtils";

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

export class WellsLayer extends CompositeLayer<WellsLayerProps> {
    static layerName: string = "WellsLayer";

    // @ts-expect-error - This is how deck.gl expects the state to be defined
    state!: {
        hoveredPipeIndex: number | null;
        mdCoordinate: [number, number, number] | null;
    };

    updateState(params: any): void {
        super.updateState(params);

        const { boundingBox } = this.props;

        this.props.reportBoundingBox?.({
            layerBoundingBox: boundingBox,
        });
    }

    getPickingInfo({ info }: GetPickingInfoParams): LayerPickInfo {
        if (!info.sourceLayer?.id.includes("pipe-layer")) {
            this.setState({ mdCoordinate: null });

            return info;
        }

        const wellbore = this.props.data[info.index];
        if (!wellbore) {
            this.setState({ mdCoordinate: null });
            return info;
        }
        info.object = this.props.data[info.index];

        const coordinate = info.coordinate ?? [0, 0, 0];

        const trajectory = wellbore.coordinates.map((coord) => vec3.fromArray(coord));

        const md = getMd(vec3.fromArray(coordinate), wellbore.properties.mdArray, trajectory);

        if (md !== null) {
            const mdCoordinate = getCoordinateForMd(md, wellbore.properties.mdArray, trajectory);
            if (mdCoordinate === null) {
                this.setState({ mdCoordinate: null });
            } else {
                this.setState({ mdCoordinate: [mdCoordinate?.x ?? 0, mdCoordinate?.y ?? 0, mdCoordinate?.z ?? 0] });
            }
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
        this.setState({ mdCoordinate: null });

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
        return [
            new PathLayer({
                id: "path-layer",
                data: this.props.data.map((well) => well.coordinates.map((coord) => [coord[0], coord[1], coord[2]])),
                getPath: (d: any) => d,
                getColor: [255, 0, 0],
                getWidth: 5,
                widthUnits: "meters",
                pickable: false,
                billboard: true,
            }),
            new PipeLayer({
                id: "pipe-layer",
                data: this.props.data.map((well) => {
                    return {
                        id: well.properties.uuid,
                        centerLinePath: well.coordinates.map((coord) => {
                            return { x: coord[0], y: coord[1], z: coord[2] };
                        }),
                    };
                }),
                material: true,
                pickable: true,
                // @ts-expect-error - This is how deck.gl expects the state to be defined
                parameters: { depthTest: true },
            }),
            new PointCloudLayer({
                id: "hover-md-layer",
                data: this.state.mdCoordinate ? [this.state.mdCoordinate] : [],
                getPosition: (d: any) => d,
                getColor: [255, 0, 0],
                getRadius: 30,
                sizeUnits: "meters",
                pickable: false,
                billboard: true,
                visible: this.state.mdCoordinate !== null,
            }),
        ];
    }
}
