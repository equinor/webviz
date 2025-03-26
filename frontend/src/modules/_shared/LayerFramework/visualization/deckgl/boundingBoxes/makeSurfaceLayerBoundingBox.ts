import type { BBox } from "@lib/utils/bbox";
import type { FactoryFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";

import type { RealizationSurfaceData } from "../../../layers/implementations/RealizationSurfaceLayer";

export function makeSurfaceLayerBoundingBox({
    getData,
}: FactoryFunctionArgs<any, RealizationSurfaceData>): BBox | null {
    const data = getData();
    if (!data) {
        return null;
    }

    return {
        min: {
            x: data.surfaceData.transformed_bbox_utm.min_x,
            y: data.surfaceData.transformed_bbox_utm.min_y,
            z: 0,
        },
        max: {
            x: data.surfaceData.transformed_bbox_utm.max_x,
            y: data.surfaceData.transformed_bbox_utm.max_y,
            z: 0,
        },
    };
}
