import { CompositeLayer, GetPickingInfoParams, Layer, LayerContext, PickingInfo } from "@deck.gl/core";
import { PathStyleExtension } from "@deck.gl/extensions";
import { ColumnLayer, LineLayer, PathLayer } from "@deck.gl/layers";

import { AnimatedPathLayer } from "./AnimatedPathLayer";

export type EditablePolylineLayerProps = {
    id: string;
    polyline: EditablePolyline;
    mouseHoverPoint?: number[];
};

export type EditablePolyline = {
    color: [number, number, number, number];
    path: number[][];
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

    // @ts-expect-error
    state!: {
        hoveredEntity: {
            layer: "line" | "point";
            index: number;
        } | null;
        dashStart: number;
    };

    initializeState(context: LayerContext): void {
        this.state = {
            hoveredEntity: null,
            dashStart: 0,
        };
    }

    makePolylineData(
        polyline: number[][],
        zMid: number,
        zExtension: number,
        selectedPolylineIndex: number | null,
        hoveredPolylineIndex: number | null,
        color: [number, number, number, number]
    ): {
        polygonData: { polygon: number[][]; color: number[] }[];
        columnData: { index: number; centroid: number[]; color: number[] }[];
    } {
        const polygonData: {
            polygon: number[][];
            color: number[];
        }[] = [];

        const columnData: {
            index: number;
            centroid: number[];
            color: number[];
        }[] = [];

        const width = 10;
        for (let i = 0; i < polyline.length; i++) {
            const startPoint = polyline[i];
            const endPoint = polyline[i + 1];

            if (i < polyline.length - 1) {
                const lineVector = [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1], 0];
                const zVector = [0, 0, 1];
                const normalVector = [
                    lineVector[1] * zVector[2] - lineVector[2] * zVector[1],
                    lineVector[2] * zVector[0] - lineVector[0] * zVector[2],
                    lineVector[0] * zVector[1] - lineVector[1] * zVector[0],
                ];
                const normalizedNormalVector = [
                    normalVector[0] / Math.sqrt(normalVector[0] ** 2 + normalVector[1] ** 2 + normalVector[2] ** 2),
                    normalVector[1] / Math.sqrt(normalVector[0] ** 2 + normalVector[1] ** 2 + normalVector[2] ** 2),
                ];

                const point1 = [
                    startPoint[0] - (normalizedNormalVector[0] * width) / 2,
                    startPoint[1] - (normalizedNormalVector[1] * width) / 2,
                    zMid - zExtension / 2,
                ];

                const point2 = [
                    endPoint[0] - (normalizedNormalVector[0] * width) / 2,
                    endPoint[1] - (normalizedNormalVector[1] * width) / 2,
                    zMid - zExtension / 2,
                ];

                const point3 = [
                    endPoint[0] + (normalizedNormalVector[0] * width) / 2,
                    endPoint[1] + (normalizedNormalVector[1] * width) / 2,
                    zMid - zExtension / 2,
                ];

                const point4 = [
                    startPoint[0] + (normalizedNormalVector[0] * width) / 2,
                    startPoint[1] + (normalizedNormalVector[1] * width) / 2,
                    zMid - zExtension / 2,
                ];

                const polygon: number[][] = [point1, point2, point3, point4];
                polygonData.push({ polygon, color: [color[0], color[1], color[2], color[3] / 2] });
            }

            let adjustedColor = color;
            if (i === selectedPolylineIndex) {
                if (i === 0 || i === polyline.length - 1) {
                    adjustedColor = [0, 255, 0, color[3]];
                    if (i === hoveredPolylineIndex) {
                        adjustedColor = [200, 255, 200, color[3]];
                    }
                } else {
                    adjustedColor = [60, 60, 255, color[3]];
                    if (i === hoveredPolylineIndex) {
                        adjustedColor = [120, 120, 255, color[3]];
                    }
                }
            } else if (i === hoveredPolylineIndex) {
                adjustedColor = [120, 120, 255, color[3]];
            }
            columnData.push({
                index: i,
                centroid: [startPoint[0], startPoint[1], zMid - zExtension / 2],
                color: adjustedColor,
            });
        }

        return { polygonData, columnData };
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
        const { polyline, mouseHoverPoint } = this.props;

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
                    if (context.index === polyline.referencePathPointIndex) {
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
                pickable: true,
                parameters: {
                    depthTest: false,
                },
                updateTriggers: {
                    getFillColor: [this.state.hoveredEntity, polyline.referencePathPointIndex],
                    getLineWidth: [this.state.hoveredEntity, polyline.referencePathPointIndex],
                },
            })
        );

        if (polyline.referencePathPointIndex !== undefined && mouseHoverPoint && this.state.hoveredEntity === null) {
            layers.push(
                new LineLayer({
                    id: "line",
                    data: [{ from: polyline.path[polyline.referencePathPointIndex], to: mouseHoverPoint }],
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
