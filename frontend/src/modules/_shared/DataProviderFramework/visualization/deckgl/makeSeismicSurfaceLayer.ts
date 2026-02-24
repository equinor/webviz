import { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { SurfaceProviderMeta } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/SeismicSurfaceProvider";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import { SurfaceDataFormat, type SurfaceData } from "../../dataProviders/implementations/surfaceProviders/types";

export function makeSeismicSurfaceLayer({
    id,
    name,
    state,
}: TransformerArgs<SurfaceData, SurfaceProviderMeta>): MapLayer | null {
    const snapshot = state?.snapshot;
    if (!snapshot) {
        return null;
    }

    const data = snapshot.data;
    const colorScaleSpec = snapshot.meta.colorScale;
    const showContours = snapshot.meta.showContours;

    let contours: [number, number] = [-1, -1];
    if (showContours?.enabled && showContours.value !== null) {
        contours = [0, showContours.value];
    }

    if (!data) {
        return null;
    }

    return new MapLayer({
        id,
        name,
        meshData:
            data.format === SurfaceDataFormat.FLOAT
                ? data.surfaceData.valuesFloat32Arr
                : data.surfaceData.png_image_base64,
        frame: {
            origin: [data.surfaceData.surface_def.origin_utm_x, data.surfaceData.surface_def.origin_utm_y],
            count: [data.surfaceData.surface_def.npoints_x, data.surfaceData.surface_def.npoints_y],
            increment: [data.surfaceData.surface_def.inc_x, data.surfaceData.surface_def.inc_y],
            rotDeg: data.surfaceData.surface_def.rot_deg,
        },
        valueRange: [data.surfaceData.value_min, data.surfaceData.value_max],
        colorMapRange: [data.surfaceData.value_min, data.surfaceData.value_max],
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScaleSpec, {
            valueMin: data.surfaceData.value_min,
            valueMax: data.surfaceData.value_max,
            denormalize: true,
        }),
        contours: contours,
        isContoursDepth: true,
        gridLines: false,
    });
}
