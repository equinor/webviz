import {
    CompositeLayer,
    type CompositeLayerProps,
    type GetPickingInfoParams,
    type Layer,
    type PickingInfo,
    type UpdateParameters,
} from "@deck.gl/core";
import { LineLayer, PathLayer, ScatterplotLayer } from "@deck.gl/layers";

import type { Polyline } from "@modules/3DViewer/view/utils/PolylinesPlugin";

import { AnimatedPathLayer } from "./AnimatedPathLayer";

export enum AllowHoveringOf {
    NONE = "none",
    LINES = "line",
    POINTS = "point",
    LINES_AND_POINTS = "lines-and-points",
}

export type EditablePolylineLayerProps = {
    id: string;
    polyline: Polyline;
    polylineVersion: number;
    mouseHoverPoint?: number[];
    referencePathPointIndex?: number;
    allowHoveringOf: AllowHoveringOf;
};

export type EditablePolylineLayerPickingInfo = PickingInfo & {
    editableEntity?: {
        type: "line" | "point";
        index: number;
    };
};

export function isEditablePolylineLayerPickingInfo(info: PickingInfo): info is EditablePolylineLayerPickingInfo {
    return (
        Object.keys(info).includes("editableEntity") &&
        ((info as EditablePolylineLayerPickingInfo).editableEntity?.type === "line" ||
            (info as EditablePolylineLayerPickingInfo).editableEntity?.type === "point")
    );
}

export class EditablePolylineLayer extends CompositeLayer<EditablePolylineLayerProps> {
    static layerName: string = "EditablePolylineLayer";

    // @ts-expect-error - deck.gl types are wrong
    state!: {
        hoveredEntity: {
            layer: "line" | "point";
            index: number;
        } | null;
    };

    initializeState(): void {
        this.state = {
            hoveredEntity: null,
        };
    }

    getPickingInfo({ info }: GetPickingInfoParams): EditablePolylineLayerPickingInfo {
        if (info && info.sourceLayer && info.index !== undefined && info.index !== -1) {
            let layer: "line" | "point" | null = null;
            if (info.sourceLayer.id.includes("lines-selection")) {
                layer = "line";
            } else if (info.sourceLayer.id.includes("points")) {
                layer = "point";
            }
            return {
                ...info,
                editableEntity: layer
                    ? {
                          type: layer,
                          index: info.index,
                      }
                    : undefined,
            };
        }

        return info;
    }

    onHover(info: EditablePolylineLayerPickingInfo): boolean {
        if (!info.editableEntity || this.props.allowHoveringOf === AllowHoveringOf.NONE) {
            this.setState({
                hoveredEntity: null,
            });
            return false;
        }

        if (this.props.allowHoveringOf === AllowHoveringOf.LINES && info.editableEntity.type === "point") {
            return false;
        }

        if (this.props.allowHoveringOf === AllowHoveringOf.POINTS && info.editableEntity.type === "line") {
            return false;
        }

        this.setState({
            hoveredEntity: {
                layer: info.editableEntity.type,
                index: info.index,
            },
        });

        return false;
    }

    shouldUpdateState(
        params: UpdateParameters<Layer<EditablePolylineLayerProps & Required<CompositeLayerProps>>>,
    ): boolean {
        if (params.props.polylineVersion !== params.oldProps.polylineVersion) {
            return true;
        }

        return super.shouldUpdateState(params);
    }

    renderLayers() {
        const { polyline, mouseHoverPoint, referencePathPointIndex, visible } = this.props;

        if (!visible || !polyline) {
            return [];
        }

        const layers: Layer<any>[] = [];

        if (referencePathPointIndex !== undefined && mouseHoverPoint && this.state.hoveredEntity === null) {
            layers.push(
                new LineLayer({
                    ...this.getSubLayerProps({
                        id: "line",
                        data: [{ from: polyline.path[referencePathPointIndex], to: mouseHoverPoint }],
                        getSourcePosition: (d: any) => d.from,
                        getTargetPosition: (d: any) => d.to,
                        getColor: [polyline.color[0], polyline.color[1], polyline.color[2], 100],
                        getWidth: 10,
                        widthUnits: "meters",
                        widthMinPixels: 3,
                        parameters: {
                            depthTest: false,
                        },
                    }),
                }),
                new ScatterplotLayer({
                    ...this.getSubLayerProps({
                        id: "hover-point",
                        data: [mouseHoverPoint],
                        getPosition: (d: any) => d,
                        getFillColor: [polyline.color[0], polyline.color[1], polyline.color[2], 100],
                        getRadius: 10,
                        radiusUnits: "pixels",
                        radiusMinPixels: 5,
                        radiusMaxPixels: 10,
                        pickable: false,
                        parameters: {
                            depthTest: false,
                        },
                    }),
                }),
            );
        }

        const polylinePathLayerData: number[][][] = [];
        for (let i = 0; i < polyline.path.length - 1; i++) {
            polylinePathLayerData.push([polyline.path[i], polyline.path[i + 1]]);
        }

        if (this.state.hoveredEntity && this.state.hoveredEntity.layer === "line") {
            const hoveredLine = polylinePathLayerData[this.state.hoveredEntity.index];
            layers.push(
                new PathLayer({
                    ...this.getSubLayerProps({
                        id: "hovered-line",
                        data: [hoveredLine],
                        getPath: (d: any) => d,
                        getColor: [255, 255, 255, 50],
                        getWidth: 20,
                        widthUnits: "meters",
                        widthMinPixels: 6,
                        parameters: {
                            depthTest: false,
                        },
                        pickable: false,
                    }),
                }),
            );
        }

        layers.push(
            new AnimatedPathLayer({
                ...this.getSubLayerProps({
                    id: "lines",
                    data: polylinePathLayerData,
                    getColor: polyline.color,
                    getPath: (d: any) => d,
                    getDashArray: [10, 10],
                    dashJustified: true,
                    getWidth: 10,
                    billboard: true,
                    widthUnits: "meters",
                    widthMinPixels: 3,
                    widthMaxPixels: 10,
                    parameters: {
                        depthTest: false,
                    },
                    pickable: false,
                    depthTest: false,
                    updateTriggers: {
                        getPath: [polyline.version],
                        getPosition: [polyline.version],
                        getRadius: [polyline.version],
                        getLineColor: [polyline.version],
                        getFillColor: [polyline.version],
                        getLineWidth: [polyline.version],
                    },
                }),
            }),
            new PathLayer({
                ...this.getSubLayerProps({
                    id: "lines-selection",
                    data: polylinePathLayerData,
                    getColor: [0, 0, 0, 0],
                    getPath: (d: any) => d,
                    getWidth: 50,
                    widthMinPixels: 10,
                    widthMaxPixels: 20,
                    billboard: false,
                    widthUnits: "meters",
                    parameters: {
                        depthTest: false,
                    },
                    pickable: true,
                }),
            }),
        );

        layers.push(
            new ScatterplotLayer({
                ...this.getSubLayerProps({
                    id: "points",
                    data: polyline.path,
                    getPosition: (d: any) => d,
                    getFillColor: (_: any, context: any) => {
                        if (context.index === referencePathPointIndex) {
                            return [255, 255, 255, 255];
                        }
                        return polyline.color;
                    },
                    getLineColor: (_: any, context: any) => {
                        if (
                            this.state.hoveredEntity &&
                            this.state.hoveredEntity.layer === "point" &&
                            context.index === this.state.hoveredEntity.index
                        ) {
                            return [255, 255, 255, 255];
                        }
                        return [0, 0, 0, 0];
                    },
                    getLineWidth: (_: any, context: any) => {
                        if (
                            this.state.hoveredEntity &&
                            this.state.hoveredEntity.layer === "point" &&
                            context.index === this.state.hoveredEntity.index
                        ) {
                            return 5;
                        }
                        return 0;
                    },
                    getRadius: (_: any, context: any) => {
                        if (
                            this.state.hoveredEntity?.layer === "point" &&
                            context.index === this.state.hoveredEntity.index
                        ) {
                            return 12;
                        }
                        return 10;
                    },
                    stroked: true,
                    radiusUnits: "pixels",
                    lineWidthUnits: "meters",
                    lineWidthMinPixels: 3,
                    radiusMinPixels: 5,
                    pickable: true,
                    parameters: {
                        depthTest: false,
                    },
                    updateTriggers: {
                        getLineWidth: [this.state.hoveredEntity, referencePathPointIndex],
                        getLineColor: [this.state.hoveredEntity],
                        getFillColor: [referencePathPointIndex],
                        getRadius: [this.state.hoveredEntity, referencePathPointIndex],
                    },
                }),
            }),
        );

        return layers;
    }
}
