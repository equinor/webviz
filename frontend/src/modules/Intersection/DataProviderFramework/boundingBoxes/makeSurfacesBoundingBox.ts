import { fromNumArray, type BBox } from "@lib/utils/bbox";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    RealizationSurfacesData,
    RealizationSurfacesSettings,
    RealizationSurfacesStoredData,
} from "../customDataProviderImplementations/RealizationSurfacesProvider";
import { createValidExtensionLength } from "../utils/extensionLengthUtils";

/**
 * Build a bounding box for the intersection surface data.
 *
 * The intersection uz-coordinates are provided as the xy-coordinates of the bounding box,
 * as they are to be visualized in a 2D view.
 */
export function makeSurfacesBoundingBox({
    getData,
    getSetting,
    getStoredData,
    isLoading,
}: TransformerArgs<
    RealizationSurfacesSettings,
    RealizationSurfacesData,
    RealizationSurfacesStoredData,
    any
>): BBox | null {
    const data = getData();
    const polylineActualSectionLengths = getStoredData("polylineWithSectionLengths")?.actualSectionLengths;
    const extensionLength = createValidExtensionLength(
        getSetting(Setting.INTERSECTION),
        getSetting(Setting.WELLBORE_EXTENSION_LENGTH),
    );

    if (!data || !polylineActualSectionLengths || isLoading) {
        return null;
    }

    const minX = -extensionLength;
    const maxX = polylineActualSectionLengths.reduce((sum, length) => sum + length, -extensionLength);

    // If no surfaces are selected
    if (data.length === 0) {
        return null;
    }

    let minY = Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
    for (const surface of data) {
        // Find valid min and max values for the surface
        const { min: surfaceMin, max: surfaceMax } = surface.z_points.reduce(
            (acc, z) => {
                if (z === null) {
                    return acc;
                }

                return {
                    min: Math.min(acc.min, z),
                    max: Math.max(acc.max, z),
                };
            },
            { min: Number.MAX_VALUE, max: -Number.MAX_VALUE },
        );

        // Update the overall min and max values
        minY = Math.min(minY, surfaceMin);
        maxY = Math.max(maxY, surfaceMax);
    }

    return fromNumArray([minX, minY, 0, maxX, maxY, 0]);
}
