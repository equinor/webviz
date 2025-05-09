import { fromNumArray, type BBox } from "@lib/utils/bbox";
import type {
    IntersectionRealizationGridData,
    IntersectionRealizationGridSettings,
    IntersectionRealizationGridStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationGridProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { createTransformedPolylineIntersectionResult } from "@modules/_shared/Intersection/gridIntersectionTransform";

/**
 * Build a bounding box for the intersection grid data.
 *
 * The intersection uz-coordinates are provided as the xy-coordinates of the bounding box,
 * as they are to be visualized in a 2D view.
 */
export function makeGridBoundingBox({
    isLoading,
    getData,
    getStoredData,
    getSetting,
}: TransformerArgs<
    IntersectionRealizationGridSettings,
    IntersectionRealizationGridData,
    IntersectionRealizationGridStoredData,
    any
>): BBox | null {
    const polylineIntersectionData = getData();
    const extensionLength = getSetting(Setting.WELLBORE_EXTENSION_LENGTH) ?? 0;
    const polylineActualSectionLengths = getStoredData("polylineWithSectionLengths")?.actualSectionLengths;

    if (!polylineIntersectionData || !polylineActualSectionLengths || isLoading) {
        return null;
    }

    // Ensure consistency between fetched data and requested polyline
    if (polylineIntersectionData.fenceMeshSections.length !== polylineActualSectionLengths.length) {
        throw new Error(
            `Number of fence mesh sections (${polylineIntersectionData.fenceMeshSections.length}) does not match  number of actual section
            lengths (${polylineActualSectionLengths.length}) for requested polyline`,
        );
    }

    const transformedPolylineIntersection = createTransformedPolylineIntersectionResult(
        polylineIntersectionData,
        polylineActualSectionLengths,
    );

    const minX = -extensionLength;
    let maxX = -extensionLength;

    // If no sections, return a bounding box with only the x-coordinates
    if (transformedPolylineIntersection.fenceMeshSections.length === 0) {
        return fromNumArray([minX, 0, 0, maxX, 0, 0]);
    }

    let minY = Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
    for (const section of transformedPolylineIntersection.fenceMeshSections) {
        maxX += section.sectionLength;

        minY = Math.min(minY, section.minZ);
        maxY = Math.max(maxY, section.maxZ);
    }

    return fromNumArray([minX, minY, 0, maxX, maxY, 0]);
}
