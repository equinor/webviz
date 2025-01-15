import { CompositeLayer, Layer, PickingInfo } from "@deck.gl/core";
import { ColumnLayer, SolidPolygonLayer } from "@deck.gl/layers";

export type EditablePolylineLayerProps = {
    id: string;
    editable: boolean;
    polylines: Polyline[];
};

export type Polyline = {
    id: string;
    color: [number, number, number, number];
    polyline: number[][];
};

export class EditablePolylineLayer extends CompositeLayer<EditablePolylineLayerProps> {
    static layerName: string = "EditablePolylineLayer";

    private _polylines: Polyline[] = [];
    private _editingPolylineId: string | null = null;
    private _hoveredPolylinePointIndex: number | null = null;
    private _hoveredPreviewPoint: number[] | null = null;
    private _isDragging = false;

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
        return this._polylines.find((polyline) => polyline.id === id);
    }

    handlePolylineHover(pickingInfo: PickingInfo): void {
        if (!this._editingPolylineId) {
            return;
        }
        const polyline = this.getPolylineById(this._editingPolylineId);
        if (!polyline) {
            return;
        }
        if (pickingInfo.object && pickingInfo.object.index < polyline.polyline.length) {
            this._hoveredPolylinePointIndex = pickingInfo.object.index;
        } else {
            this._hoveredPolylinePointIndex = null;
        }

        this.setNeedsUpdate();
    }

    handlePolylineClick(pickingInfo: PickingInfo, event: any): void {
        if (!this._editingPolylineId) {
            return;
        }
        const polyline = this.getPolylineById(this._editingPolylineId);
        if (!polyline) {
            return;
        }

        if (pickingInfo.object && pickingInfo.object.index < polyline.polyline.length) {
            this._hoveredPreviewPoint = null;
            this._hoveredPolylinePointIndex = pickingInfo.object.index;
            event.stopPropagation();
            event.handled = true;
        } else {
            this._hoveredPolylinePointIndex = null;
        }
    }

    handlePolylineDragStart(): void {
        this._hoveredPreviewPoint = null;
        this._isDragging = true;

        if (!this._editingPolylineId) {
            return;
        }
    }

    handlePolylineDragEnd(): void {
        this._isDragging = false;
    }

    handlePolylineDrag(pickingInfo: PickingInfo): void {
        if (!this._editingPolylineId) {
            return;
        }

        if (pickingInfo.object) {
            const index = pickingInfo.object.index;
            if (!pickingInfo.coordinate) {
                return;
            }

            const polyline = this.getPolylineById(this._editingPolylineId);
            if (!polyline) {
                return;
            }

            const newPolyline = polyline.polyline.reduce((acc, point, i) => {
                if (i === index && pickingInfo.coordinate) {
                    return [...acc, [pickingInfo.coordinate[0], pickingInfo.coordinate[1]]];
                }
                return [...acc, point];
            }, [] as number[][]);

            polyline.polyline = newPolyline;
        }
    }

    onHover(event: any): boolean {
        this._hoveredPreviewPoint = event.coordinate;
        this.setNeedsUpdate();
        return true;
    }

    renderLayers() {
        const layers: Layer<any>[] = [];

        const previewData: { centroid: number[]; color: [number, number, number, number] }[] = [];
        if (this._hoveredPreviewPoint) {
            previewData.push({
                centroid: this._hoveredPreviewPoint,
                color: [255, 255, 255, 100],
            });
        }

        for (const polyline of this._polylines) {
            const { polygonData, columnData } = this.makePolylineData(polyline.polyline, 0, 10, 0, 0, polyline.color);

            layers.push(
                new SolidPolygonLayer({
                    id: `polygon-${polyline.id}`,
                    data: polygonData,
                    getPolygon: (d) => d.polygon,
                    getFillColor: (d) => d.color,
                    extruded: true,
                    wireframe: true,
                    opacity: 0.5,
                }),
                new ColumnLayer({
                    id: "user-polyline-point-layer",
                    data: columnData,
                    getElevation: 1,
                    getPosition: (d) => d.centroid,
                    getFillColor: (d) => d.color,
                    extruded: true,
                    radius: 50,
                    radiusUnits: "pixels",
                    pickable: true,
                    onHover: this.handlePolylineHover,
                    onClick: this.handlePolylineClick,
                    onDragStart: this.handlePolylineDragStart,
                    onDragEnd: this.handlePolylineDragEnd,
                    onDrag: this.handlePolylineDrag,
                })
            );
        }

        layers.push(
            new ColumnLayer({
                id: "user-polyline-hover-point-layer",
                data: previewData,
                getElevation: 1000,
                getPosition: (d) => d.centroid,
                getFillColor: (d) => d.color,
                extruded: true,
                radius: 50,
                radiusUnits: "pixels",
                pickable: true,
            })
        );

        return layers;
    }
}
