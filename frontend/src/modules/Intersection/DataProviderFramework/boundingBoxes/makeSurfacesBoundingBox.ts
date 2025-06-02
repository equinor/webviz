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

    // If no surfaces are selected
    if (data.length === 0) {
        return null;
    }

    // Find the minimum and maximum coordinates (uz-coordinates) across all surfaces
    let minX = Number.MAX_VALUE;
    let maxX = -Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
    for (const surface of data) {
        if (surface.z_points.length !== surface.cum_lengths.length) {
            throw new Error("Surface z_points and cum_lengths must have the same length");
        }

        for (const [index, point] of surface.z_points.entries()) {
            // Skip invalid points, e.g. points outside of surface
            if (point === null) {
                continue;
            }

            minX = Math.min(minX, surface.cum_lengths[index]);
            maxX = Math.max(maxX, surface.cum_lengths[index]);
            minY = Math.min(minY, point);
            maxY = Math.max(maxY, point);
        }
    }

    return fromNumArray([minX, minY, 0, maxX, maxY, 0]);
}
