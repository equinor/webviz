import type { BBox } from "@lib/utils/bbox";
import type { DataProviderMeta } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/customDataProviderImplementation";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { SurfaceData } from "../../dataProviders/implementations/surfaceProviders/types";

export function makeSurfaceLayerBoundingBox({ state }: TransformerArgs<SurfaceData, DataProviderMeta>): BBox | null {
    const data = state?.snapshot?.data;
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
