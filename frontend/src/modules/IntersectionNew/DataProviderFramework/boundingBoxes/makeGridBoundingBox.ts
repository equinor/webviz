import type { BBox } from "@lib/utils/bbox";
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
    const intersectionExtensionLength = getSetting(Setting.INTERSECTION_EXTENSION_LENGTH);
    const polylineActualSectionLengths = getStoredData("polylineWithSectionLengths")?.actualSectionLengths;

    if (!polylineIntersectionData || !intersectionExtensionLength || !polylineActualSectionLengths) {
        return null;
    }

    // Temporary
    // TODO: Handle loading state for color scale, or provide another layer for loading state
    if (isLoading) {
        return null;
    }

    // Temporary until we can ensure that fetched data and settings/stored data is synced as long
    // as isLoading is false
    if (polylineIntersectionData.fenceMeshSections.length !== polylineActualSectionLengths.length) {
        throw new Error(
            "The number of fence mesh sections does not match the number of requested actual section lengths",
        );
        return null;
    }

    const transformedPolylineIntersection = createTransformedPolylineIntersectionResult(
        polylineIntersectionData,
        polylineActualSectionLengths,
    );

    const minX = -intersectionExtensionLength;
    let maxX = -intersectionExtensionLength;
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;

    for (const section of transformedPolylineIntersection.fenceMeshSections) {
        maxX += section.sectionLength;

        minY = Math.min(minY, section.minZ);
        maxY = Math.max(maxY, section.maxZ);
    }

    return {
        min: {
            x: minX,
            y: minY,
            z: 0,
        },
        max: {
            x: maxX,
            y: maxY,
            z: 0,
        },
    };
}
