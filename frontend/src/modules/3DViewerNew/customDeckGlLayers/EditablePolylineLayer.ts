import { CompositeLayer, type GetPickingInfoParams, type Layer, type PickingInfo } from "@deck.gl/core";
import { LineLayer, PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { Polyline } from "@modules/3DViewerNew/view/utils/PolylinesPlugin";

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
        dashStart: number;
    };

    initializeState(): void {
        this.state = {
            hoveredEntity: null,
            dashStart: 0,
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

    renderLayers() {
        const { polyline, mouseHoverPoint, referencePathPointIndex } = this.props;

        const layers: Layer<any>[] = [];

        if (referencePathPointIndex !== undefined && mouseHoverPoint && this.state.hoveredEntity === null) {
            layers.push(
                new LineLayer({
                    id: "line",
                    data: [{ from: polyline.path[referencePathPointIndex], to: mouseHoverPoint }],
                    getSourcePosition: (d) => d.from,
                    getTargetPosition: (d) => d.to,
                    getColor: [polyline.color[0], polyline.color[1], polyline.color[2], 100],
                    getWidth: 10,
                    widthUnits: "meters",
                    widthMinPixels: 3,
                    parameters: {
                        depthTest: false,
                    },
                }),
                new ScatterplotLayer({
                    id: "hover-point",
                    data: [mouseHoverPoint],
                    getPosition: (d) => d,
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
                    id: "hovered-line",
                    data: [hoveredLine],
                    getPath: (d) => d,
                    getColor: [255, 255, 255, 50],
                    getWidth: 20,
                    widthUnits: "meters",
                    widthMinPixels: 6,
                    parameters: {
                        depthTest: false,
                    },
                    pickable: false,
                }),
            );
        }

        layers.push(
            new AnimatedPathLayer({
                id: "lines",
                data: polylinePathLayerData,
                dashStart: 0,
                getColor: polyline.color,
                getPath: (d) => d,
                getDashArray: [10, 10],
                getDashOffset: this.state.dashStart,
                dashJustified: true,
                getWidth: 10,
                billboard: true,
                widthUnits: "meters",
                widthMinPixels: 3,
                widthMaxPixels: 10,
                parameters: {
                    // @ts-expect-error - deck.gl types are wrong
                    depthTest: false,
                },
                pickable: false,
                depthTest: false,
            }),
            new PathLayer({
                id: "lines-selection",
                data: polylinePathLayerData,
                getColor: [0, 0, 0, 0],
                getPath: (d) => d,
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
        );
        /*
        layers.push(
            new ScatterplotLayer({
                id: "points-selection",
                data: polyline.path,
                getPosition: (d) => d,
                getRadius: (d, context) => {
                    if (
                        this.state.hoveredEntity?.layer === "point" &&
                        context.index === this.state.hoveredEntity.index
                    ) {
                        return 10;
                    }
                    return 5;
                },
                getFillColor: [255, 255, 255, 1],
                getLineColor: [0, 0, 0, 0],
                getLineWidth: 30,
                lineWidthMinPixels: 10,
                radiusUnits: "pixels",
                pickable: true,
                parameters: {
                    depthTest: false,
                },
                updateTriggers: {
                    getRadius: [this.state.hoveredEntity, referencePathPointIndex],
                },
            })
        );
        */

        layers.push(
            new ScatterplotLayer({
                id: "points",
                data: polyline.path,
                getPosition: (d) => d,
                getFillColor: (_, context) => {
                    if (context.index === referencePathPointIndex) {
                        return [255, 255, 255, 255];
                    }
                    return polyline.color;
                },
                getLineColor: (_, context) => {
                    if (
                        this.state.hoveredEntity &&
                        this.state.hoveredEntity.layer === "point" &&
                        context.index === this.state.hoveredEntity.index
                    ) {
                        return [255, 255, 255, 255];
                    }
                    return [0, 0, 0, 0];
                },
                getLineWidth: (_, context) => {
                    if (
                        this.state.hoveredEntity &&
                        this.state.hoveredEntity.layer === "point" &&
                        context.index === this.state.hoveredEntity.index
                    ) {
                        return 5;
                    }
                    return 0;
                },
                getRadius: (_, context) => {
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
        );

        return layers;
    }
}
