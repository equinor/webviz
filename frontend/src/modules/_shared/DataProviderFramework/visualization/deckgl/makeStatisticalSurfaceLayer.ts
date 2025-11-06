import { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import {
    type StatisticalSurfaceData,
    type StatisticalSurfaceSettings,
    type StatisticalSurfaceStoredData,
    SurfaceDataFormat,
} from "../../dataProviders/implementations/StatisticalSurfaceProvider";

export function makeStatisticalSurfaceLayer({
    id,
    name,
    getData,
    getSetting,
}: TransformerArgs<StatisticalSurfaceSettings, StatisticalSurfaceData, StatisticalSurfaceStoredData>): MapLayer | null {
    const data = getData();
    const colorScaleSpec = getSetting(Setting.COLOR_SCALE);

    let contours: [number, number] = [-1, -1];
    const { enabled: contourEnabled, value: contourValue } = getSetting(Setting.CONTOURS) ?? {
        enabled: false,
        value: 0,
    };
    if (contourEnabled && contourValue !== null) {
        contours = [0, contourValue];
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
