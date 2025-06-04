import type { SeismicCubeMeta_api } from "@api";
import type { Layer } from "@deck.gl/core";
import * as bbox from "@lib/utils/bbox";
import { degreesToRadians, ShapeType, type Geometry } from "@lib/utils/geometry";
import { rotatePoint2Around } from "@lib/utils/vec2";
import * as vec3 from "@lib/utils/vec3";
import {
    SeismicFenceMeshLayer,
    type SeismicFenceMeshSectionWithLoadingGeometry,
} from "@modules/3DViewerNew/customDeckGlLayers/SeismicFenceMeshLayer/SeismicFenceMeshLayer";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    RealizationSeismicSlicesData,
    RealizationSeismicSlicesSettings,
    RealizationSeismicSlicesStoredData,
} from "../customDataProviderImplementations/RealizationSeismicSlicesProvider";

function predictDepthSliceGeometry(
    seismicCubeMeta: SeismicCubeMeta_api,
    seismicDepthSliceNumber: number | null,
): Geometry | null {
    if (!seismicCubeMeta || seismicDepthSliceNumber === null) {
        return null;
    }

    const xmin = seismicCubeMeta.spec.xOrigin;
    const xmax = seismicCubeMeta.spec.xOrigin + seismicCubeMeta.spec.xInc * (seismicCubeMeta.spec.numCols - 1);

    const ymin = seismicCubeMeta.spec.yOrigin;
    const ymax =
        seismicCubeMeta.spec.yOrigin +
        seismicCubeMeta.spec.yInc * seismicCubeMeta.spec.yFlip * (seismicCubeMeta.spec.numRows - 1);

    const zmin = seismicDepthSliceNumber;
    const zmax = zmin;

    const maxXY = { x: xmax, y: ymax };
    const maxX = { x: xmax, y: ymin };
    const maxY = { x: xmin, y: ymax };
    const origin = { x: seismicCubeMeta.spec.xOrigin, y: seismicCubeMeta.spec.yOrigin };

    const rotatedMaxXY = rotatePoint2Around(maxXY, origin, degreesToRadians(seismicCubeMeta.spec.rotationDeg));
    const rotatedMaxX = rotatePoint2Around(maxX, origin, degreesToRadians(seismicCubeMeta.spec.rotationDeg));
    const rotatedMaxY = rotatePoint2Around(maxY, origin, degreesToRadians(seismicCubeMeta.spec.rotationDeg));

    const boundingBox = bbox.create(
        vec3.create(Math.min(origin.x, rotatedMaxXY.x), Math.min(origin.y, rotatedMaxXY.y), zmin),
        vec3.create(Math.max(origin.x, rotatedMaxXY.x), Math.max(origin.y, rotatedMaxXY.y), zmax),
    );

    const vecU = vec3.create(rotatedMaxX.x - origin.x, rotatedMaxX.y - origin.y, 0);
    const vecV = vec3.create(rotatedMaxY.x - origin.x, rotatedMaxY.y - origin.y, 0);

    const width = vec3.length(vecU);
    const height = vec3.length(vecV);

    const geometry: Geometry = {
        shapes: [
            {
                type: ShapeType.BOX,
                centerPoint: vec3.create((origin.x + rotatedMaxXY.x) / 2, (origin.y + rotatedMaxXY.y) / 2, zmin),
                dimensions: {
                    width,
                    height,
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
    seismicCubeMeta: SeismicCubeMeta_api,
    seismicCrosslineNumber: number | null,
): Geometry | null {
    if (!seismicCubeMeta || seismicCrosslineNumber === null) {
        return null;
    }

    const xmin = seismicCubeMeta.spec.xOrigin;
    const xmax = seismicCubeMeta.spec.xOrigin + seismicCubeMeta.spec.xInc * (seismicCubeMeta.spec.numCols - 1);

    const ymin =
        seismicCubeMeta.spec.yOrigin + seismicCubeMeta.spec.yInc * seismicCubeMeta.spec.yFlip * seismicCrosslineNumber;
    const ymax = ymin;

    const zmin = seismicCubeMeta.spec.zOrigin;
    const zmax =
        seismicCubeMeta.spec.zOrigin +
        seismicCubeMeta.spec.zInc * seismicCubeMeta.spec.zFlip * (seismicCubeMeta.spec.numLayers - 1);

    const maxXY = { x: xmax, y: ymax };
    const minXY = { x: xmin, y: ymin };
    const origin = { x: seismicCubeMeta.spec.xOrigin, y: seismicCubeMeta.spec.yOrigin };

    const rotatedMinXY = rotatePoint2Around(minXY, origin, degreesToRadians(seismicCubeMeta.spec.rotationDeg));
    const rotatedMaxXY = rotatePoint2Around(maxXY, origin, degreesToRadians(seismicCubeMeta.spec.rotationDeg));

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
    seismicCubeMeta: SeismicCubeMeta_api,
    seismicInlineNumber: number | null,
): Geometry | null {
    if (!seismicCubeMeta || seismicInlineNumber === null) {
        return null;
    }

    const xmin = seismicCubeMeta.spec.xOrigin + seismicCubeMeta.spec.yInc * seismicInlineNumber;
    const xmax = xmin;

    const ymin = seismicCubeMeta.spec.yOrigin;
    const ymax =
        seismicCubeMeta.spec.yOrigin +
        seismicCubeMeta.spec.yInc * seismicCubeMeta.spec.yFlip * (seismicCubeMeta.spec.numRows - 1);

    const zmin = seismicCubeMeta.spec.zOrigin;
    const zmax =
        seismicCubeMeta.spec.zOrigin +
        seismicCubeMeta.spec.zInc * seismicCubeMeta.spec.zFlip * (seismicCubeMeta.spec.numLayers - 1);

    const maxXY = { x: xmax, y: ymax };
    const minXY = { x: xmin, y: ymin };
    const origin = { x: seismicCubeMeta.spec.xOrigin, y: seismicCubeMeta.spec.yOrigin };

    const rotatedMinXY = rotatePoint2Around(minXY, origin, (seismicCubeMeta.spec.rotationDeg / 180.0) * Math.PI);
    const rotatedMaxXY = rotatePoint2Around(maxXY, origin, (seismicCubeMeta.spec.rotationDeg / 180.0) * Math.PI);

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

export function makeSeismicSlicesLayer(
    args: TransformerArgs<
        RealizationSeismicSlicesSettings,
        RealizationSeismicSlicesData,
        RealizationSeismicSlicesStoredData
    >,
): Layer<any> | null {
    const { id, name, getData, getSetting, getStoredData, isLoading, getValueRange } = args;
    const data = getData();
    const colorScaleSpec = getSetting(Setting.COLOR_SCALE);
    const slicesSettings = getSetting(Setting.SEISMIC_SLICES);
    const slices = getStoredData("seismicSlices");
    const seismicCubeMeta = getStoredData("seismicCubeMeta");
    const omitColor = getSetting(Setting.OMIT_COLOR);
    const omitRange = getSetting(Setting.OMIT_RANGE);
    const valueRange = getValueRange();

    if (!seismicCubeMeta || !slicesSettings) {
        return null;
    }

    const previewOrLoading = !slicesSettings.applied || isLoading;

    const predictedGeometries: Geometry[] = [];
    const sections: SeismicFenceMeshSectionWithLoadingGeometry[] = [];

    // Inline slice
    if (slicesSettings.visible[0]) {
        const inlinePreviewGeometry = predictInlineGeometry(seismicCubeMeta, slicesSettings.value[0]);

        if (slices && data) {
            const inlineBbox: number[][] = [
                [data.inline.bbox_utm[0][0], data.inline.bbox_utm[0][1], data.inline.u_min],
                [data.inline.bbox_utm[1][0], data.inline.bbox_utm[1][1], data.inline.u_min],
                [data.inline.bbox_utm[0][0], data.inline.bbox_utm[0][1], data.inline.u_max],
                [data.inline.bbox_utm[1][0], data.inline.bbox_utm[1][1], data.inline.u_max],
            ];
            sections.push({
                id: "inline-slice",
                section: {
                    boundingBox: inlineBbox,
                    properties: data.inline.dataFloat32Arr,
                    propertiesOffset: 0,
                    numSamplesU: data.inline.u_num_samples,
                    numSamplesV: data.inline.v_num_samples,
                },
                loadingGeometry: inlinePreviewGeometry ?? undefined,
            });
        } else if (inlinePreviewGeometry) {
            sections.push({
                id: "inline-slice",
                loadingGeometry: inlinePreviewGeometry,
            });
        }
    }

    // Crossline slice
    if (slicesSettings.visible[1]) {
        const crosslinePreviewGeometry = predictCrosslineGeometry(seismicCubeMeta, slicesSettings.value[1]);
        if (crosslinePreviewGeometry) {
            predictedGeometries.push(crosslinePreviewGeometry);
        }

        if (slices && data) {
            const crosslineBbox: number[][] = [
                [data.crossline.bbox_utm[0][0], data.crossline.bbox_utm[0][1], data.crossline.u_min],
                [data.crossline.bbox_utm[1][0], data.crossline.bbox_utm[1][1], data.crossline.u_min],
                [data.crossline.bbox_utm[0][0], data.crossline.bbox_utm[0][1], data.crossline.u_max],
                [data.crossline.bbox_utm[1][0], data.crossline.bbox_utm[1][1], data.crossline.u_max],
            ];
            sections.push({
                id: "crossline-slice",
                section: {
                    boundingBox: crosslineBbox,
                    properties: data.crossline.dataFloat32Arr,
                    propertiesOffset: 0,
                    numSamplesU: data.crossline.u_num_samples,
                    numSamplesV: data.crossline.v_num_samples,
                },
                loadingGeometry: crosslinePreviewGeometry ?? undefined,
            });
        } else if (crosslinePreviewGeometry) {
            sections.push({
                id: "crossline-slice",
                loadingGeometry: crosslinePreviewGeometry,
            });
        }
    }

    // Depth slice
    if (slicesSettings.visible[2]) {
        const depthPreviewGeometry = predictDepthSliceGeometry(seismicCubeMeta, slicesSettings.value[2] ?? null);
        if (depthPreviewGeometry) {
            predictedGeometries.push(depthPreviewGeometry);
        }

        if (slices && data) {
            const depthBbox = [
                [data.depthSlice.bbox_utm[0][0], data.depthSlice.bbox_utm[0][1], slices[2]],
                [data.depthSlice.bbox_utm[3][0], data.depthSlice.bbox_utm[3][1], slices[2]],
                [data.depthSlice.bbox_utm[1][0], data.depthSlice.bbox_utm[1][1], slices[2]],
                [data.depthSlice.bbox_utm[2][0], data.depthSlice.bbox_utm[2][1], slices[2]],
            ];
            sections.push({
                id: "depth-slice",
                section: {
                    boundingBox: depthBbox,
                    properties: data.depthSlice.dataFloat32Arr,
                    propertiesOffset: 0,
                    numSamplesU: data.depthSlice.u_num_samples,
                    numSamplesV: data.depthSlice.v_num_samples,
                },
                loadingGeometry: depthPreviewGeometry ?? undefined,
            });
        } else if (depthPreviewGeometry) {
            sections.push({
                id: "depth-slice",
                loadingGeometry: depthPreviewGeometry,
            });
        }
    }

    return new SeismicFenceMeshLayer({
        id,
        name,
        data: sections,
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScaleSpec, {
            valueMin: valueRange?.[0] ?? 0,
            valueMax: valueRange?.[1] ?? 0,
            midPoint: 0,
            specialColor: {
                color: omitColor ?? "#000000",
                range: omitRange ?? [0, 0],
            },
        }),
        zIncreaseDownwards: true,
        isLoading: previewOrLoading,
    });
}
