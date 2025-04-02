import type { SurfaceDef_api } from "@api";
import { degreesToRadians } from "@lib/utils/geometry";
import type { Vec2 } from "@lib/utils/vec2";
import { rotatePoint2Around } from "@lib/utils/vec2";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { FactoryFunctionArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import { ColormapLayer, Grid3DLayer } from "@webviz/subsurface-viewer/dist/layers";

import {
    type StatisticalSurfaceData,
    type StatisticalSurfaceSettings,
    SurfaceDataFormat,
} from "../customDataProviderImplementations/StatisticalSurface";

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
}: FactoryFunctionArgs<StatisticalSurfaceSettings, StatisticalSurfaceData>): ColormapLayer | Grid3DLayer | null {
    const data = getData();
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;

    if (!data) {
        return null;
    }

    if (data.format === SurfaceDataFormat.FLOAT) {
        return new Grid3DLayer({
            id,
            name,
            data: data.surfaceData.valuesFloat32Arr,
            parameters: {
                depthWriteEnabled: false,
            },
            colorMapFunction: makeColorMapFunctionFromColorScale(
                colorScale,
                data.surfaceData.value_min,
                data.surfaceData.value_max,
            ),
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
        colorMapFunction: makeColorMapFunctionFromColorScale(
            colorScale,
            data.surfaceData.value_min,
            data.surfaceData.value_max,
        ),
    });
}
