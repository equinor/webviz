import type { BBox } from "@lib/utils/bbox";
import type { DataProviderMeta } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { RealizationGridData } from "../utils/types";

export function makeRealizationGridBoundingBox({ state }: TransformerArgs<RealizationGridData, DataProviderMeta>): BBox | null {
    const data = state?.snapshot?.data;
    if (!data) {
        return null;
    }

    return {
        min: {
            x: data.gridSurfaceData.origin_utm_x + data.gridSurfaceData.xmin,
            y: data.gridSurfaceData.origin_utm_y + data.gridSurfaceData.ymin,
            z: -data.gridSurfaceData.zmax,
        },
        max: {
            x: data.gridSurfaceData.origin_utm_x + data.gridSurfaceData.xmax,
            y: data.gridSurfaceData.origin_utm_y + data.gridSurfaceData.ymax,
            z: -data.gridSurfaceData.zmin,
        },
    };
}
