import * as bbox from "@lib/utils/bbox";
import type { IntersectionRealizationGridSettings } from "@modules/_shared/LayerFramework/layers/implementations/IntersectionRealizationGridLayer";
import type { FactoryFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import type { PolylineIntersection_trans } from "@modules/_shared/utils/wellbore";

export function makeRealizationIntersectionBoundingBox({
    getData,
}: FactoryFunctionArgs<IntersectionRealizationGridSettings, PolylineIntersection_trans>): bbox.BBox | null {
    const data = getData();
    if (!data) {
        return null;
    }

    let boundingBox: bbox.BBox = bbox.create(
        {
            x: 0,
            y: 0,
            z: 0,
        },
        {
            x: 0,
            y: 0,
            z: 0,
        },
    );

    for (const section of data.fenceMeshSections) {
        let minZ = Number.MAX_VALUE;
        let maxZ = Number.MIN_VALUE;
        for (const vertex of section.verticesUzFloat32Arr) {
            minZ = Math.min(minZ, vertex);
            maxZ = Math.max(maxZ, vertex);
        }
        boundingBox = bbox.combine(
            boundingBox,
            bbox.create(
                {
                    x: section.start_utm_x,
                    y: section.start_utm_y,
                    z: minZ,
                },
                {
                    x: section.end_utm_x,
                    y: section.end_utm_y,
                    z: maxZ,
                },
            ),
        );
    }

    return boundingBox;
}
