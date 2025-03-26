import type { BBox } from "@lib/utils/bbox";
import type { FactoryFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";

import type { RealizationGridData } from "../customLayerImplementations/RealizationGridLayer";

export function makeRealizationGridBoundingBox({
    getData,
}: FactoryFunctionArgs<any, RealizationGridData>): BBox | null {
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
