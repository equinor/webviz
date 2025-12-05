import type { BBox } from "@lib/utils/bbox";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { SurfaceData } from "../../dataProviders/implementations/surfaceProviders/types";

export function makeSurfaceLayerBoundingBox({ getData }: TransformerArgs<any, SurfaceData>): BBox | null {
    const data = getData();
    if (!data) {
        return null;
    }

    return {
        min: {
            x: data.surfaceData.transformed_bbox_utm.min_x,
            y: data.surfaceData.transformed_bbox_utm.min_y,
            z: data.surfaceData.value_min,
        },
        max: {
            x: data.surfaceData.transformed_bbox_utm.max_x,
            y: data.surfaceData.transformed_bbox_utm.max_y,
            z: data.surfaceData.value_max,
        },
    };
}
