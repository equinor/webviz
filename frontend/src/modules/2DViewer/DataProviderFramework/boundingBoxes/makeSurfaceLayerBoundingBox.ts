import type { BBox } from "@lib/utils/bbox";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

<<<<<<<< HEAD:frontend/src/modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeSurfaceLayerBoundingBox.ts
import type { RealizationSurfaceData } from "../../../layers/implementations/RealizationSurfaceLayer";
========
import type { RealizationSurfaceData } from "../customDataProviderImplementations/RealizationSurfaceProvider";
>>>>>>>> origin/dpf-improve-dep-tree:frontend/src/modules/2DViewer/DataProviderFramework/boundingBoxes/makeSurfaceLayerBoundingBox.ts

export function makeSurfaceLayerBoundingBox({ getData }: TransformerArgs<any, RealizationSurfaceData>): BBox | null {
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
