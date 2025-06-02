import type { Layer } from "@deck.gl/core";

import * as bbox from "@lib/utils/bbox";
import { type Geometry, ShapeType, degreesToRadians } from "@lib/utils/geometry";
import { rotatePoint2Around } from "@lib/utils/vec2";
import * as vec3 from "@lib/utils/vec3";
import { SeismicFenceMeshLayer } from "@modules/3DViewerNew/customDeckGlLayers/SeismicFenceMeshLayer/SeismicFenceMeshLayer";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { SeismicSliceData_trans } from "../utils/transformSeismicSlice";
import type { RealizationSeismicSlicesStoredData } from "../customDataProviderImplementations/RealizationSeismicSlicesProvider";
import type { SeismicCubeMeta_api } from "@api";

export enum Plane {
    CROSSLINE = "CROSSLINE",
    INLINE = "INLINE",
    DEPTH = "DEPTH",
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

export function makeSeismicFenceMeshLayerFunction(plane: Plane) {
    return function makeSeismicFenceMeshLayer(
        args: TransformerArgs<any, SeismicSliceData_trans, RealizationSeismicSlicesStoredData>,
    ): Layer<any> | null {
        const { id, name, getData, getSetting, getStoredData, isLoading } = args;
        const data = getData();
        const colorScaleSpec = getSetting(Setting.COLOR_SCALE);
        const slices = getSetting(Setting.SEISMIC_SLICES);
        const seismicCubeMeta = getStoredData("seismicCubeMeta");
        const attribute = getSetting(Setting.ATTRIBUTE);
        const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
        const omitColor = getSetting(Setting.OMIT_COLOR);
        const omitRange = getSetting(Setting.OMIT_RANGE);

        if (!data || !seismicCubeMeta) {
            return null;
        }

        let bbox: number[][] = [
            [data.bbox_utm[0][0], data.bbox_utm[0][1], data.u_min],
            [data.bbox_utm[1][0], data.bbox_utm[1][1], data.u_min],
            [data.bbox_utm[0][0], data.bbox_utm[0][1], data.u_max],
            [data.bbox_utm[1][0], data.bbox_utm[1][1], data.u_max],
        ];

        let predictedGeometry: Geometry | null = null;

        bbox = [
            [data.bbox_utm[0][0], data.bbox_utm[0][1], slices[2] ?? 0],
            [data.bbox_utm[3][0], data.bbox_utm[3][1], slices[2] ?? 0],
            [data.bbox_utm[1][0], data.bbox_utm[1][1], slices[2] ?? 0],
            [data.bbox_utm[2][0], data.bbox_utm[2][1], slices[2] ?? 0],
        ];

        predictedGeometry = predictDepthSliceGeometry(seismicCubeMeta, slices[2] ?? null, attribute, timeOrInterval);

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
                specialColor: {
                    color: omitColor ?? "#000000",
                    range: omitRange ?? [0, 0],
                },
            }),
            zIncreaseDownwards: true,
            isLoading,
            opacity: 0.5,
            loadingGeometry: predictedGeometry ?? undefined,
        });
    };
}
