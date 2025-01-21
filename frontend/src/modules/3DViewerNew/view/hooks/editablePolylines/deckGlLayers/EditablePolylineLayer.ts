import { CompositeLayer, GetPickingInfoParams, Layer, PickingInfo } from "@deck.gl/core";
import { PathStyleExtension } from "@deck.gl/extensions";
import { ColumnLayer, LineLayer, PathLayer } from "@deck.gl/layers";

import { AnimatedPathLayer } from "./AnimatedPathLayer";

import { Polyline } from "../types";

export type EditablePolylineLayerProps = {
    id: string;
    polyline: Polyline;
    mouseHoverPoint?: number[];
    referencePathPointIndex?: number;
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
            } else if (info.sourceLayer.id.includes("points-selection")) {
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
        if (!info.editableEntity) {
            this.setState({
                hoveredEntity: null,
            });
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

        const polylinePathLayerData: number[][][] = [];
        for (let i = 0; i < polyline.path.length - 1; i++) {
            polylinePathLayerData.push([polyline.path[i], polyline.path[i + 1]]);
        }

        layers.push(
            new AnimatedPathLayer({
                id: "lines",
                data: polylinePathLayerData,
                dashStart: 0,
                getColor: polyline.color,
                getPath: (d) => d,
                getDashArray: [10, 10],
                getWidth: 10,
                billboard: true,
                widthUnits: "meters",
                extensions: [new PathStyleExtension({ highPrecisionDash: true })],
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
                billboard: true,
                widthUnits: "meters",
                parameters: {
                    depthTest: false,
                },
                pickable: true,
            }),
            new ColumnLayer({
                id: "points",
                data: polyline.path,
                getElevation: 1,
                getPosition: (d) => d,
                getFillColor: (d, context) => {
                    if (context.index === referencePathPointIndex) {
                        return [230, 136, 21, 255];
                    }
                    return [255, 255, 255, 255];
                },
                getLineColor: [230, 136, 21, 255],
                getLineWidth: (d, context) => {
                    if (
                        this.state.hoveredEntity &&
                        this.state.hoveredEntity.layer === "point" &&
                        context.index === this.state.hoveredEntity.index
                    ) {
                        return 20;
                    }
                    return 10;
                },
                stroked: true,
                extruded: false,
                radius: 20,
                radiusUnits: "pixels",
                pickable: false,
                parameters: {
                    depthTest: false,
                },
                updateTriggers: {
                    getFillColor: [this.state.hoveredEntity, referencePathPointIndex],
                    getLineWidth: [this.state.hoveredEntity, referencePathPointIndex],
                },
            }),
            new ColumnLayer({
                id: "points-selection",
                data: polyline.path,
                getElevation: 1,
                getPosition: (d) => d,
                getFillColor: [255, 255, 255, 1],
                getLineColor: [0, 0, 0, 0],
                getLineWidth: 1,
                extruded: false,
                radius: 40,
                radiusUnits: "pixels",
                pickable: true,
                parameters: {
                    depthTest: false,
                },
            })
        );

        if (referencePathPointIndex !== undefined && mouseHoverPoint && this.state.hoveredEntity === null) {
            layers.push(
                new LineLayer({
                    id: "line",
                    data: [{ from: polyline.path[referencePathPointIndex], to: mouseHoverPoint }],
                    getSourcePosition: (d) => d.from,
                    getTargetPosition: (d) => d.to,
                    getColor: [230, 136, 21, 100],
                    getWidth: 2,
                    parameters: {
                        depthTest: false,
                    },
                }),
                new ColumnLayer({
                    id: "hover-point",
                    data: [mouseHoverPoint],
                    getElevation: 1,
                    getPosition: (d) => d,
                    getFillColor: [230, 136, 21, 255],
                    extruded: false,
                    radius: 20,
                    radiusUnits: "pixels",
                    pickable: false,
                    parameters: {
                        depthTest: false,
                    },
                })
            );
        }

        return layers;
    }
}
