import { CompositeLayer, Layer, LayerContext, PickingInfo } from "@deck.gl/core";
import { PathStyleExtension } from "@deck.gl/extensions";
import { ColumnLayer } from "@deck.gl/layers";

import { AnimatedPathLayer } from "./AnimatedPathLayer";

export type EditablePolylineLayerProps = {
    id: string;
    editablePolylineId: string | null;
    polylines: Polyline[];
};

export type Polyline = {
    id: string;
    color: [number, number, number, number];
    polyline: number[][];
};

export class EditablePolylineLayer extends CompositeLayer<EditablePolylineLayerProps> {
    static layerName: string = "EditablePolylineLayer";

    // @ts-expect-error
    state!: {
        hoveredPolylinePoint: {
            polylineId: string;
            pointIndex: number;
        } | null;
        dashStart: number;
    };

    initializeState(context: LayerContext): void {
        this.state = {
            hoveredPolylinePoint: null,
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

    private getPolylineById(id: string): Polyline | undefined {
        return this.props.polylines.find((polyline) => polyline.id === id);
    }

    private extractPolylineIdFromSourceLayerId(sourceLayerId: string): string | null {
        const match = sourceLayerId.match(/points-(.*)/);
        if (!match) {
            return null;
        }

        return match[1];
    }

    onHover(info: PickingInfo): boolean {
        const sourceLayerId = info.sourceLayer?.id;
        if (info.index !== undefined && sourceLayerId) {
            const polylineId = this.extractPolylineIdFromSourceLayerId(sourceLayerId);
            if (!polylineId) {
                return false;
            }

            const polyline = this.getPolylineById(polylineId);
            if (!polyline) {
                return false;
            }

            this.setState({
                hoveredPolylinePoint: {
                    polylineId,
                    pointIndex: info.index,
                },
            });

            return true;
        }

        this.setState({
            hoveredPolylinePoint: null,
        });

        return false;
    }

    renderLayers() {
        const layers: Layer<any>[] = [];

        for (const polyline of this.props.polylines) {
            const polylineData: { from: number[]; to: number[] }[] = [];
            for (let i = 0; i < polyline.polyline.length - 1; i++) {
                polylineData.push({ from: polyline.polyline[i], to: polyline.polyline[i + 1] });
            }
            layers.push(
                new AnimatedPathLayer({
                    id: `lines-${polyline.id}`,
                    data: [polyline.polyline],
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
                    depthTest: false,
                })
            );
            layers.push(
                new ColumnLayer({
                    id: `points-${polyline.id}`,
                    data: polyline.polyline,
                    getElevation: 1,
                    getPosition: (d) => d,
                    getFillColor: (d, i) =>
                        this.state.hoveredPolylinePoint?.polylineId === polyline.id &&
                        this.state.hoveredPolylinePoint.pointIndex === i.index
                            ? [230, 136, 21, 255]
                            : polyline.color,
                    extruded: false,
                    radius: 20,
                    radiusUnits: "pixels",
                    pickable: true,
                    parameters: {
                        depthTest: false,
                    },
                    updateTriggers: {
                        getFillColor: [this.state.hoveredPolylinePoint],
                    },
                })
            );
        }

        return layers;
    }
}
