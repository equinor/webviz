import {
    CompositeLayer,
    type CompositeLayerProps,
    type FilterContext,
    type GetPickingInfoParams,
    type Layer,
    type LayerContext,
    type PickingInfo,
    type UpdateParameters,
} from "@deck.gl/core";
import { PathLayer, TextLayer } from "@deck.gl/layers";
import { type Geometry, ShapeType, degreesToRadians } from "@lib/utils/geometry";
import type { ExtendedLayerProps } from "@webviz/subsurface-viewer";

import type { Polyline } from "@modules/3DViewerNew/view/utils/PolylinesPlugin";
import { rotatePoint2Around } from "@lib/utils/vec2";
import * as vec3 from "@lib/utils/vec3";
import type { SeismicCubeMeta_api } from "@api";
import type { SeismicSliceData_trans } from "../DataProviderFramework/utils/transformSeismicSlice";

export type SeismicSlicesLayerProps = ExtendedLayerProps & {
    id: string;
    data: {
        data: SeismicSliceData_trans;
        seismicCubeMeta: SeismicCubeMeta_api[];
    };
    colorMapFunction: (value: number) => [number, number, number, number];

};

export type PolylinesLayerPickingInfo = PickingInfo & {
    polylineId?: string;
    name?: string;
};

export function isPolylinesLayerPickingInfo(info: PickingInfo): info is PolylinesLayerPickingInfo {
    return Object.keys(info).includes("polylineId");

    state!: {
        previewGeometries: Geometry[];
        sections: 
    }
}

export class SeismicSlicesLayer extends CompositeLayer<SeismicSlicesLayerProps> {
    static layerName: string = "SeismicSlicesLayer";

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initializeState(_: LayerContext): void {
        this.setState({
            hoveredPolylineIndex: null,
        });
    }

    updateState(params: UpdateParameters<Layer<ExtendedLayerProps & { id: string; data: { data: SeismicSliceData_trans; seismicCubeMeta: SeismicCubeMeta_api[]; }; colorMapFunction: (value: number) => [number, number, number, number]; } & Required<CompositeLayerProps>>>): void {
        
    }

    private makeGeometries() {

    }

    getPickingInfo({ info }: GetPickingInfoParams): PolylinesLayerPickingInfo {
        if (info && info.sourceLayer && info.object !== undefined) {
            return {
                ...info,
                name: info.object.name,
                polylineId: info.object.id,
            };
        }

        return info;
    }

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("labels")) {
            return context.viewport.zoom > -5;
        }

        return true;
    }

    renderLayers(): Layer[] {
        const { hoveredPolylineIndex } = this.state;

        const layers: Layer[] = [];

        if (this.props.selectedPolylineId) {
            const selectedPolylineIndex = this.props.polylines.findIndex((p) => p.id === this.props.selectedPolylineId);
            if (selectedPolylineIndex !== -1) {
                layers.push(
                    new PathLayer({
                        ...this.getSubLayerProps({
                            id: `selected`,
                            data: [this.props.polylines[selectedPolylineIndex]],
                            getPath: (d: Polyline) => d.path,
                            getColor: (d: Polyline) => [d.color[0], d.color[1], d.color[2], 200],
                            getWidth: 30,
                            widthUnits: "meters",
                            widthMinPixels: 5,
                            parameters: {
                                depthTest: false,
                            },
                            billboard: true,
                        }),
                    }),
                );
            }
        }

        if (hoveredPolylineIndex !== null && this.props.polylines[hoveredPolylineIndex] && this.props.hoverable) {
            layers.push(
                new PathLayer({
                    ...this.getSubLayerProps({
                        id: `hovered`,
                        data: [this.props.polylines[hoveredPolylineIndex]],
                        getPath: (d: Polyline) => d.path,
                        getColor: (d: Polyline) => [d.color[0], d.color[1], d.color[2], 100],
                        getWidth: 30,
                        widthUnits: "meters",
                        widthMinPixels: 6,
                        parameters: {
                            depthTest: false,
                        },
                        billboard: true,
                    }),
                }),
            );
        }

        const polylineLabels: { label: string; position: number[]; angle: number; color: number[] }[] = [];
        for (const polyline of this.props.polylines) {
            if (polyline.path.length < 2) {
                continue;
            }
            const vector = [
                polyline.path[1][0] - polyline.path[0][0],
                polyline.path[1][1] - polyline.path[0][1],
                polyline.path[1][2] - polyline.path[0][2],
            ];
            const length = Math.sqrt(vector[0] ** 2 + vector[1] ** 2);
            const unitVector = [vector[0] / length, vector[1] / length, vector[2] / length];
            let angle = Math.atan2(unitVector[1], unitVector[0]) * (180 / Math.PI);
            if (angle > 90 || angle < -90) {
                angle += 180;
            }
            polylineLabels.push({
                label: polyline.name,
                position: [
                    polyline.path[0][0] + (unitVector[0] * length) / 2,
                    polyline.path[0][1] + (unitVector[1] * length) / 2,
                    polyline.path[0][2] + (unitVector[2] * length) / 2,
                ],
                angle,
                color: polyline.color,
            });
        }

        layers.push(
            new PathLayer({
                ...this.getSubLayerProps({
                    id: `polylines`,
                    data: this.props.polylines,
                    getPath: (d: Polyline) => d.path,
                    getColor: (d: Polyline) => d.color,
                    getWidth: 10,
                    widthUnits: "meters",
                    widthMinPixels: 3,
                    widthMaxPixels: 10,
                    pickable: false,
                    parameters: {
                        depthTest: false,
                    },
                    billboard: true,
                }),
            }),
            new TextLayer({
                ...this.getSubLayerProps({
                    id: `polylines-labels`,
                    data: polylineLabels,
                    getPosition: (d: any) => d.position,
                    getText: (d: any) => d.label,
                    getSize: 12,
                    sizeUnits: "meters",
                    sizeMinPixels: 16,
                    getAngle: (d: any) => d.angle,
                    getColor: [0, 0, 0],
                    parameters: {
                        depthTest: false,
                    },
                    billboard: false,
                    getBackgroundColor: [255, 255, 255, 100],
                    getBackgroundPadding: [10, 10],
                    getBackgroundBorderColor: [0, 0, 0, 255],
                    getBackgroundBorderWidth: 2,
                    getBackgroundElevation: 1,
                    background: true,
                }),
            }),
            new PathLayer({
                ...this.getSubLayerProps({
                    id: `polylines-hoverable`,
                    data: this.props.polylines,
                    getPath: (d: Polyline) => d.path,
                    getColor: (d: Polyline) => [d.color[0], d.color[1], d.color[2], 1],
                    getWidth: 50,
                    widthUnits: "meters",
                    widthMinPixels: 10,
                    widthMaxPixels: 20,
                    pickable: true,
                    parameters: {
                        depthTest: false,
                    },
                }),
            }),
        );

        return layers;
    }
}

function predictDepthSliceGeometry(
    seismicCubeMeta: SeismicCubeMeta_api[],
    seismicDepthSliceNumber: number | null,
    attribute: string,
    timeOrInterval: string | null,
): Geometry | null {
    if (!seismicCubeMeta || seismicDepthSliceNumber === null) {
        return null;
    }

    const meta = seismicCubeMeta.find(
        (m) => m.seismicAttribute === attribute && m.isoDateOrInterval === timeOrInterval,
    );

    if (!meta) {
        return null;
    }

    const xmin = meta.spec.xOrigin;
    const xmax = meta.spec.xOrigin + meta.spec.xInc * (meta.spec.numCols - 1);

    const ymin = meta.spec.yOrigin;
    const ymax = meta.spec.yOrigin + meta.spec.yInc * meta.spec.yFlip * (meta.spec.numRows - 1);

    const zmin = seismicDepthSliceNumber;
    const zmax = zmin;

    const maxXY = { x: xmax, y: ymax };
    const maxX = { x: xmax, y: ymin };
    const maxY = { x: xmin, y: ymax };
    const origin = { x: meta.spec.xOrigin, y: meta.spec.yOrigin };

    const rotatedMaxXY = rotatePoint2Around(maxXY, origin, degreesToRadians(meta.spec.rotationDeg));
    const rotatedMaxX = rotatePoint2Around(maxX, origin, degreesToRadians(meta.spec.rotationDeg));
    const rotatedMaxY = rotatePoint2Around(maxY, origin, degreesToRadians(meta.spec.rotationDeg));

    const boundingBox = bbox.create(
        vec3.create(Math.min(origin.x, rotatedMaxXY.x), Math.min(origin.y, rotatedMaxXY.y), zmin),
        vec3.create(Math.max(origin.x, rotatedMaxXY.x), Math.max(origin.y, rotatedMaxXY.y), zmax),
    );

    const geometry: Geometry = {
        shapes: [
            {
                type: ShapeType.BOX,
                centerPoint: vec3.create((origin.x + rotatedMaxXY.x) / 2, (origin.y + rotatedMaxXY.y) / 2, zmin),
                dimensions: {
                    width: Math.abs(rotatedMaxX.x - origin.x),
                    height: Math.abs(rotatedMaxY.y - origin.y),
                    depth: 0,
                },
                normalizedEdgeVectors: {
                    u: vec3.normalize(vec3.create(rotatedMaxX.x - origin.x, rotatedMaxX.y - origin.y, 0)),
                    v: vec3.normalize(vec3.create(rotatedMaxY.x - origin.x, rotatedMaxY.y - origin.y, 0)),
                },
            },
        ],
        boundingBox,
    };

    return geometry;
}

function predictCrosslineGeometry(
    seismicCubeMeta: SeismicCubeMeta_api[],
    seismicCrosslineNumber: number | null,
    attribute: string,
    timeOrInterval: string | null,
): Geometry | null {
    if (!seismicCubeMeta || seismicCrosslineNumber === null) {
        return null;
    }

    const meta = seismicCubeMeta.find(
        (m) => m.seismicAttribute === attribute && m.isoDateOrInterval === timeOrInterval,
    );

    if (!meta) {
        return null;
    }

    const xmin = meta.spec.xOrigin;
    const xmax = meta.spec.xOrigin + meta.spec.xInc * (meta.spec.numCols - 1);

    const ymin = meta.spec.yOrigin + meta.spec.yInc * meta.spec.yFlip * seismicCrosslineNumber;
    const ymax = ymin;

    const zmin = meta.spec.zOrigin;
    const zmax = meta.spec.zOrigin + meta.spec.zInc * meta.spec.zFlip * (meta.spec.numLayers - 1);

    const maxXY = { x: xmax, y: ymax };
    const minXY = { x: xmin, y: ymin };
    const origin = { x: meta.spec.xOrigin, y: meta.spec.yOrigin };

    const rotatedMinXY = rotatePoint2Around(minXY, origin, degreesToRadians(meta.spec.rotationDeg));
    const rotatedMaxXY = rotatePoint2Around(maxXY, origin, degreesToRadians(meta.spec.rotationDeg));

    const geometry: Geometry = {
        shapes: [
            {
                type: ShapeType.BOX,
                centerPoint: vec3.create(
                    (rotatedMinXY.x + rotatedMaxXY.x) / 2,
                    (rotatedMinXY.y + rotatedMaxXY.y) / 2,
                    (zmin + zmax) / 2,
                ),
                dimensions: {
                    width: vec3.length(
                        vec3.create(rotatedMaxXY.x - rotatedMinXY.x, rotatedMaxXY.y - rotatedMinXY.y, 0),
                    ),
                    height: Math.abs(zmax - zmin),
                    depth: 0,
                },
                normalizedEdgeVectors: {
                    u: vec3.normalize(vec3.create(rotatedMaxXY.x - rotatedMinXY.x, rotatedMaxXY.y - rotatedMinXY.y, 0)),
                    v: vec3.create(0, 0, 1),
                },
            },
        ],
        boundingBox: bbox.create(
            vec3.create(Math.min(rotatedMinXY.x, rotatedMaxXY.x), Math.min(rotatedMinXY.y, rotatedMaxXY.y), zmin),
            vec3.create(Math.max(rotatedMinXY.x, rotatedMaxXY.x), Math.max(rotatedMinXY.y, rotatedMaxXY.y), zmax),
        ),
    };

    return geometry;
}

function predictInlineGeometry(
    seismicCubeMeta: SeismicCubeMeta_api[],
    seismicInlineNumber: number | null,
    attribute: string,
    timeOrInterval: string | null,
): Geometry | null {
    if (!seismicCubeMeta || seismicInlineNumber === null) {
        return null;
    }

    const meta = seismicCubeMeta.find(
        (m) => m.seismicAttribute === attribute && m.isoDateOrInterval === timeOrInterval,
    );

    if (!meta) {
        return null;
    }

    const xmin = meta.spec.xOrigin + meta.spec.yInc * seismicInlineNumber;
    const xmax = xmin;

    const ymin = meta.spec.yOrigin;
    const ymax = meta.spec.yOrigin + meta.spec.yInc * meta.spec.yFlip * (meta.spec.numRows - 1);

    const zmin = meta.spec.zOrigin;
    const zmax = meta.spec.zOrigin + meta.spec.zInc * meta.spec.zFlip * (meta.spec.numLayers - 1);

    const maxXY = { x: xmax, y: ymax };
    const minXY = { x: xmin, y: ymin };
    const origin = { x: meta.spec.xOrigin, y: meta.spec.yOrigin };

    const rotatedMinXY = rotatePoint2Around(minXY, origin, (meta.spec.rotationDeg / 180.0) * Math.PI);
    const rotatedMaxXY = rotatePoint2Around(maxXY, origin, (meta.spec.rotationDeg / 180.0) * Math.PI);

    const geometry: Geometry = {
        shapes: [
            {
                type: ShapeType.BOX,
                centerPoint: vec3.create(
                    (rotatedMinXY.x + rotatedMaxXY.x) / 2,
                    (rotatedMinXY.y + rotatedMaxXY.y) / 2,
                    (zmin + zmax) / 2,
                ),
                dimensions: {
                    width: vec3.length(
                        vec3.create(rotatedMaxXY.x - rotatedMinXY.x, rotatedMaxXY.y - rotatedMinXY.y, 0),
                    ),
                    height: Math.abs(zmax - zmin),
                    depth: 0,
                },
                normalizedEdgeVectors: {
                    u: vec3.normalize(vec3.create(rotatedMaxXY.x - rotatedMinXY.x, rotatedMaxXY.y - rotatedMinXY.y, 0)),
                    v: vec3.create(0, 0, 1),
                },
            },
        ],
        boundingBox: bbox.create(
            vec3.create(Math.min(rotatedMinXY.x, rotatedMaxXY.x), Math.min(rotatedMinXY.y, rotatedMaxXY.y), zmin),
            vec3.create(Math.max(rotatedMinXY.x, rotatedMaxXY.x), Math.max(rotatedMinXY.y, rotatedMaxXY.y), zmax),
        ),
    };

    return geometry;
}