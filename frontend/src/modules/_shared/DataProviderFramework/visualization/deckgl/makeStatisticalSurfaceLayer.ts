import { ColormapLayer, MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { SurfaceDef_api } from "@api";
import { degreesToRadians } from "@lib/utils/geometry";
import type { Vec2 } from "@lib/utils/vec2";
import { rotatePoint2Around } from "@lib/utils/vec2";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import {
    type StatisticalSurfaceData,
    type StatisticalSurfaceSettings,
    type StatisticalSurfaceStoredData,
    SurfaceDataFormat,
} from "../../dataProviders/implementations/StatisticalSurfaceProvider";

function calcBoundsForRotationAroundUpperLeftCorner(surfDef: SurfaceDef_api): [number, number, number, number] {
    const width = (surfDef.npoints_x - 1) * surfDef.inc_x;
    const height = (surfDef.npoints_y - 1) * surfDef.inc_y;
    const orgRotPoint: Vec2 = { x: surfDef.origin_utm_x, y: surfDef.origin_utm_y };
    const orgTopLeft: Vec2 = { x: surfDef.origin_utm_x, y: surfDef.origin_utm_y + height };

    const transTopLeft: Vec2 = rotatePoint2Around(orgTopLeft, orgRotPoint, degreesToRadians(surfDef.rot_deg));
    const tLeft = transTopLeft.x;
    const tBottom = transTopLeft.y - height;
    const tRight = transTopLeft.x + width;
    const tTop = transTopLeft.y;

    const bounds: [number, number, number, number] = [tLeft, tBottom, tRight, tTop];

    return bounds;
}

export function makeStatisticalSurfaceLayer({
    id,
    name,
    getData,
    getSetting,
}: TransformerArgs<StatisticalSurfaceSettings, StatisticalSurfaceData, StatisticalSurfaceStoredData>):
    | ColormapLayer
    | MapLayer
    | null {
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
            // contours: getSetting(Setting.CONTOURS)?.enabled,
            isContoursDepth: true,
            gridLines: false,
        });
    }

    return new ColormapLayer({
        id,
        name,
        image: `data:image/png;base64,${data.surfaceData.png_image_base64}`,
        bounds: calcBoundsForRotationAroundUpperLeftCorner(data.surfaceData.surface_def),
        rotDeg: data.surfaceData.surface_def.rot_deg,
        valueRange: [data.surfaceData.value_min, data.surfaceData.value_max],
        colorMapRange: [data.surfaceData.value_min, data.surfaceData.value_max],
        colorMapName: "Physics",
        parameters: {
            depthWriteEnabled: false,
        },
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScaleSpec, {
            valueMin: data.surfaceData.value_min,
            valueMax: data.surfaceData.value_max,
            denormalize: true,
        }),
        contours: getSetting(Setting.CONTOURS)?.enabled ?? false,
        contourInterval: getSetting(Setting.CONTOURS)?.value ?? 10,
    });
}
