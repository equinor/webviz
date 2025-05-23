import type { Layer } from "@deck.gl/core";

import * as bbox from "@lib/utils/bbox";
import { type Geometry, ShapeType, degreesToRadians } from "@lib/utils/geometry";
import { rotatePoint2Around } from "@lib/utils/vec2";
import * as vec3 from "@lib/utils/vec3";
import { SeismicFenceMeshLayer } from "@modules/3DViewerNew/customDeckGlLayers/SeismicFenceMeshLayer/SeismicFenceMeshLayer";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { RealizationSeismicDepthSliceStoredData } from "../customDataProviderImplementations/RealizationSeismicDepthProvider";
import type { SeismicSliceData_trans } from "../utils/transformSeismicSlice";

export enum Plane {
    CROSSLINE = "CROSSLINE",
    INLINE = "INLINE",
    DEPTH = "DEPTH",
}

function predictDepthSliceGeometry({
    getSetting,
    getStoredData,
}: TransformerArgs<
    [Setting.ATTRIBUTE, Setting.TIME_OR_INTERVAL, Setting.SEISMIC_DEPTH_SLICE],
    SeismicSliceData_trans,
    RealizationSeismicDepthSliceStoredData
>): Geometry | null {
    const attribute = getSetting(Setting.ATTRIBUTE);
    const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
    const seismicDepthSliceNumber = getSetting(Setting.SEISMIC_DEPTH_SLICE);
    const seismicCubeMeta = getStoredData("seismicCubeMeta");

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

function predictCrosslineGeometry({
    getSetting,
    getStoredData,
}: TransformerArgs<
    [Setting.ATTRIBUTE, Setting.TIME_OR_INTERVAL, Setting.SEISMIC_CROSSLINE],
    SeismicSliceData_trans,
    RealizationSeismicDepthSliceStoredData
>): Geometry | null {
    const attribute = getSetting(Setting.ATTRIBUTE);
    const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
    const seismicCrosslineNumber = getSetting(Setting.SEISMIC_CROSSLINE);
    const seismicCubeMeta = getStoredData("seismicCubeMeta");

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

function predictInlineGeometry({
    getSetting,
    getStoredData,
}: TransformerArgs<
    [Setting.ATTRIBUTE, Setting.TIME_OR_INTERVAL, Setting.SEISMIC_INLINE],
    SeismicSliceData_trans,
    RealizationSeismicDepthSliceStoredData
>): Geometry | null {
    const attribute = getSetting(Setting.ATTRIBUTE);
    const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
    const seismicInlineNumber = getSetting(Setting.SEISMIC_INLINE);
    const seismicCubeMeta = getStoredData("seismicCubeMeta");

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

export function makeSeismicFenceMeshLayerFunction(plane: Plane) {
    return function makeSeismicFenceMeshLayer(
        args: TransformerArgs<any, SeismicSliceData_trans, RealizationSeismicDepthSliceStoredData>,
    ): Layer<any> | null {
        const { id, name, getData, getSetting, isLoading } = args;
        const data = getData();
        const colorScaleSpec = getSetting(Setting.COLOR_SCALE);

        if (!data) {
            return null;
        }

        let bbox: number[][] = [
            [data.bbox_utm[0][0], data.bbox_utm[0][1], data.u_min],
            [data.bbox_utm[1][0], data.bbox_utm[1][1], data.u_min],
            [data.bbox_utm[0][0], data.bbox_utm[0][1], data.u_max],
            [data.bbox_utm[1][0], data.bbox_utm[1][1], data.u_max],
        ];

        let predictedGeometry: Geometry | null = null;

        if (plane === Plane.DEPTH) {
            const seismicDepthSlice = getSetting(Setting.SEISMIC_DEPTH_SLICE);
            if (seismicDepthSlice === null) {
                return null;
            }
            bbox = [
                [data.bbox_utm[0][0], data.bbox_utm[0][1], seismicDepthSlice],
                [data.bbox_utm[3][0], data.bbox_utm[3][1], seismicDepthSlice],
                [data.bbox_utm[1][0], data.bbox_utm[1][1], seismicDepthSlice],
                [data.bbox_utm[2][0], data.bbox_utm[2][1], seismicDepthSlice],
            ];

            predictedGeometry = predictDepthSliceGeometry(args);
        } else if (plane === Plane.CROSSLINE) {
            predictedGeometry = predictCrosslineGeometry(args);
        } else if (plane === Plane.INLINE) {
            predictedGeometry = predictInlineGeometry(args);
        }

        return new SeismicFenceMeshLayer({
            id,
            name,
            data: {
                sections: [
                    {
                        boundingBox: bbox,
                        properties: data.dataFloat32Arr,
                        propertiesOffset: 0,
                        numSamplesU: data.u_num_samples,
                        numSamplesV: data.v_num_samples,
                    },
                ],
            },
            colorMapFunction: makeColorMapFunctionFromColorScale(colorScaleSpec, {
                valueMin: data.value_min,
                valueMax: data.value_max,
                midPoint: 0,
            }),
            zIncreaseDownwards: true,
            isLoading,
            loadingGeometry: predictedGeometry ?? undefined,
        });
    };
}
