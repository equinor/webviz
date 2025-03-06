import { BBox } from "@lib/utils/bbox";
import { MakeLayerBoundingBoxFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";

import type { Data } from "../customLayerImplementations/RealizationGridLayer";

export function makeRealizationGridBoundingBox({ getData }: MakeLayerBoundingBoxFunctionArgs<any, Data>): BBox | null {
    const data = getData();
    if (!data) {
        return null;
    }

    return {
        min: {
            x: data.gridSurfaceData.origin_utm_x + data.gridSurfaceData.xmin,
            y: data.gridSurfaceData.origin_utm_y + data.gridSurfaceData.ymin,
            z: data.gridSurfaceData.zmin,
        },
        max: {
            x: data.gridSurfaceData.origin_utm_x + data.gridSurfaceData.xmax,
            y: data.gridSurfaceData.origin_utm_y + data.gridSurfaceData.ymax,
            z: data.gridSurfaceData.zmax,
        },
    };
}
