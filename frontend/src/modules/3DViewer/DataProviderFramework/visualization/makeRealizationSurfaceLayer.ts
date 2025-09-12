import { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import {
    type RealizationSurfaceData,
    type RealizationSurfaceSettings,
    SurfaceDataFormat,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationSurfaceProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export function makeRealizationSurfaceLayer({
    id,
    name,
    getData,
    getSetting,
}: TransformerArgs<RealizationSurfaceSettings, RealizationSurfaceData>): MapLayer | null {
    const data = getData();
    const colorScaleSpec = getSetting(Setting.COLOR_SCALE);

    if (!data) {
        return null;
    }

    if (data.format === SurfaceDataFormat.FLOAT) {
        return new MapLayer({
            id,
            name,
            meshData: data.surfaceData.valuesFloat32Arr,
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
            gridLines: false,
        });
    }

    return new MapLayer({
        id,
        name,
        meshData: data.surfaceData.png_image_base64,
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
        gridLines: false,
    });
}
