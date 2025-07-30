import type { BBox } from "@lib/utils/bbox";
import type {
    IntersectionRealizationSeismicData,
    IntersectionRealizationSeismicStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationSeismicProvider";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export function makeIntersectionRealizationSeismicBoundingBox({
    getData,
    getStoredData,
}: TransformerArgs<any, IntersectionRealizationSeismicData, IntersectionRealizationSeismicStoredData>): BBox | null {
    const data = getData();
    const polyline = getStoredData("seismicFencePolylineWithSectionLengths");
    if (!polyline || !data) {
        return null;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    const minZ = data.min_fence_depth;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const maxZ = data.max_fence_depth;

    for (let i = 0; i < polyline.polylineUtmXy.length; i += 2) {
        const x = polyline.polylineUtmXy[i];
        const y = polyline.polylineUtmXy[i + 1];

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
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
