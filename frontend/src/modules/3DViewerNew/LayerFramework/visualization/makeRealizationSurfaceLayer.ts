import { SurfaceDataPng_api } from "@api";
import { VisualizationFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/LayerFramework/visualization/utils/colors";
import { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import { RealizationSurfaceSettings } from "../customLayerImplementations/RealizationSurfaceLayer/types";

function isSurfaceDataFloat(apiData: SurfaceDataFloat_trans | SurfaceDataPng_api): apiData is SurfaceDataFloat_trans {
    return Object.hasOwn(apiData, "valuesFloat32Arr");
}

export function makeRealizationSurfaceLayer({
    id,
    name,
    data,
    colorScale,
}: VisualizationFunctionArgs<RealizationSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>): MapLayer {
    if (isSurfaceDataFloat(data)) {
        return new MapLayer({
            id,
            name,
            meshData: data.valuesFloat32Arr,
            frame: {
                origin: [data.surface_def.origin_utm_x, data.surface_def.origin_utm_y],
                count: [data.surface_def.npoints_x, data.surface_def.npoints_y],
                increment: [data.surface_def.inc_x, data.surface_def.inc_y],
                rotDeg: data.surface_def.rot_deg,
            },
            valueRange: [data.value_min, data.value_max],
            colorMapRange: [data.value_min, data.value_max],
            colorMapFunction: makeColorMapFunctionFromColorScale(colorScale, data.value_min, data.value_max),
            gridLines: false,
        });
    }

    return new MapLayer({
        id,
        name,
        meshData: data.png_image_base64,
        frame: {
            origin: [data.surface_def.origin_utm_x, data.surface_def.origin_utm_y],
            count: [data.surface_def.npoints_x, data.surface_def.npoints_y],
            increment: [data.surface_def.inc_x, data.surface_def.inc_y],
            rotDeg: data.surface_def.rot_deg,
        },
        valueRange: [data.value_min, data.value_max],
        colorMapRange: [data.value_min, data.value_max],
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScale, data.value_min, data.value_max),
        gridLines: false,
    });
}
