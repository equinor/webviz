import type { BBox } from "@lib/utils/bbox";
import type { IntersectionRealizationGridData } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export function makeIntersectionRealizationGridBoundingBox({
    getData,
}: TransformerArgs<any, IntersectionRealizationGridData>): BBox | null {
    const data = getData();
    if (!data) {
        return null;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (const section of data.fenceMeshSections) {
        minX = Math.min(minX, section.start_utm_x, section.end_utm_x);
        minY = Math.min(minY, section.start_utm_y, section.end_utm_y);
        maxX = Math.max(maxX, section.start_utm_x, section.end_utm_x);
        maxY = Math.max(maxY, section.start_utm_y, section.end_utm_y);

        for (let i = 0; i < section.verticesUzFloat32Arr.length; i += 2) {
            const z = section.verticesUzFloat32Arr[i + 1];
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
        }
    }

    return {
        min: {
            x: minX,
            y: minY,
            z: minZ,
        },
        max: {
            x: maxX,
            y: maxY,
            z: maxZ,
        },
    };
}
