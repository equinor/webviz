import { CompositeLayer, GetPickingInfoParams, Layer, PickingInfo } from "@deck.gl/core";
import { ColumnLayer, LineLayer } from "@deck.gl/layers";

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

    private _editingPolylineId: string | null = null;
    private _hoveredPolylinePointIndex: number | null = null;

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

    getPickingInfo({ info }: GetPickingInfoParams): PickingInfo {
        if (!this._editingPolylineId) {
            return info;
        }
        const polyline = this.getPolylineById(this._editingPolylineId);
        if (!polyline) {
            return info;
        }
        if (info.object && info.object.index < polyline.polyline.length) {
            this._hoveredPolylinePointIndex = info.object.index;
        } else {
            this._hoveredPolylinePointIndex = null;
        }

        this.setNeedsUpdate();
        return info;
    }

    renderLayers() {
        const layers: Layer<any>[] = [];

        for (const polyline of this.props.polylines) {
            const polylineData: { from: number[]; to: number[] }[] = [];
            for (let i = 0; i < polyline.polyline.length - 1; i++) {
                polylineData.push({ from: polyline.polyline[i], to: polyline.polyline[i + 1] });
            }
            layers.push(
                new LineLayer({
                    id: `lines-${polyline.id}`,
                    data: polylineData,
                    getColor: polyline.color,
                    getSourcePosition: (d) => d.from,
                    getTargetPosition: (d) => d.to,
                    getWidth: 3,
                    parameters: { depthTest: false },
                    billboard: true,
                    widthUnits: "pixels",
                })
            );
            layers.push(
                new ColumnLayer({
                    id: `points-${polyline.id}`,
                    data: polyline.polyline,
                    getElevation: 1,
                    getPosition: (d) => d,
                    getFillColor: (d, i) =>
                        this._hoveredPolylinePointIndex === i.index ? [0, 0, 255, 255] : polyline.color,
                    extruded: false,
                    radius: 20,
                    radiusUnits: "pixels",
                    pickable: true,
                    parameters: {
                        depthTest: false,
                    },
                })
            );
        }

        return layers;
    }
}
