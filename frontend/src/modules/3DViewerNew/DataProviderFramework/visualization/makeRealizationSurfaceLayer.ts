import {
    type RealizationSurfaceData,
    type RealizationSurfaceSettings,
    SurfaceDataFormat,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationSurfaceProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

export function makeRealizationSurfaceLayer({
    id,
    name,
    getData,
    getSetting,
}: TransformerArgs<RealizationSurfaceSettings, RealizationSurfaceData>): MapLayer | null {
    const data = getData();
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;

    if (!data) {
        return null;
    }

    if (data.surfaceData.format === SurfaceDataFormat.FLOAT) {
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
            colorMapFunction: makeColorMapFunctionFromColorScale(
                colorScale,
                data.surfaceData.value_min,
                data.surfaceData.value_max,
            ),
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
        colorMapFunction: makeColorMapFunctionFromColorScale(
            colorScale,
            data.surfaceData.value_min,
            data.surfaceData.value_max,
        ),
        gridLines: false,
    });
}
