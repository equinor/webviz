import type { BBox } from "@lib/utils/bbox";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

<<<<<<<< HEAD:frontend/src/modules/_shared/DataProviderFramework/visualization/deckgl/boundingBoxes/makeRealizationGridBoundingBox.ts
import type { RealizationGridData } from "../../../layers/implementations/RealizationGridLayer";
========
import type { RealizationGridData } from "../customDataProviderImplementations/RealizationGridProvider";
>>>>>>>> origin/dpf-improve-dep-tree:frontend/src/modules/2DViewer/DataProviderFramework/boundingBoxes/makeRealizationGridBoundingBox.ts

export function makeRealizationGridBoundingBox({ getData }: TransformerArgs<any, RealizationGridData>): BBox | null {
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
