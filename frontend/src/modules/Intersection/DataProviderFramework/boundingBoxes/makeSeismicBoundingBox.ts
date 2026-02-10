import { fromNumArray, type BBox } from "@lib/utils/bbox";
import type {
    IntersectionRealizationSeismicData,
    IntersectionRealizationSeismicProviderMeta,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationSeismicProvider";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

/**
 * Build a bounding box for the intersection seismic data.
 *
 * The intersection uz-coordinates are provided as the xy-coordinates of the bounding box,
 * as they are to be visualized in a 2D view.
 */
export function makeSeismicBoundingBox({
    state,
    isLoading,
}: TransformerArgs<IntersectionRealizationSeismicData, IntersectionRealizationSeismicProviderMeta>): BBox | null {
    const snapshot = state?.snapshot;
    if (!snapshot) {
        return null;
    }

    const data = snapshot.data;
    const polylineActualSectionLengths = snapshot.meta.sourcePolylineActualSectionLengths;
    const extensionLength = snapshot.meta.extensionLength;

    if (!data || !polylineActualSectionLengths || isLoading) {
        return null;
    }

    const minX = -extensionLength;
    const maxX = polylineActualSectionLengths.reduce((sum, length) => sum + length, -extensionLength);
    const minY = data.min_fence_depth;
    const maxY = data.max_fence_depth;

    return fromNumArray([minX, minY, 0, maxX, maxY, 0]);
}
