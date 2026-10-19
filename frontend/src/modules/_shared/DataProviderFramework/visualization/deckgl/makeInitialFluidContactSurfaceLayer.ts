import type { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import { DepthSurfaceLayer } from "@modules/_shared/customDeckGlLayers/DepthSurfaceLayer";
import type { InitialFluidContactSurfaceSettings } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/InitialFluidContactSurfaceProvider";
import { SurfaceDataFormat, type SurfaceData } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/types";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export function makeInitialFluidContactSurfaceLayer({
    id,
    name,
    getData,
    getSetting,
}: TransformerArgs<InitialFluidContactSurfaceSettings, SurfaceData>): MapLayer | null {
    const data = getData();
    if (!data) {
        return null;
    }

    const colorScaleSpec = getSetting(Setting.DEPTH_COLOR_SCALE);
    const contourSetting = getSetting(Setting.CONTOURS);
    const contours: [number, number] =
        contourSetting?.enabled && contourSetting.value !== null ? [0, contourSetting.value] : [-1, -1];

    return new DepthSurfaceLayer({
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
        contours,
        isContoursDepth: true,
        gridLines: false,
        pickable: true,
    });
}