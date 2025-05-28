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

    // Find the minimum and maximum z-coordinates (uz-coordinates) across all surfaces
    let minY = Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
    for (const surface of data) {
        for (const point of surface.z_points) {
            if (point === null) {
                continue;
            }
            minY = Math.min(minY, point);
            maxY = Math.max(maxY, point);
        }
    }

    return fromNumArray([minX, minY, 0, maxX, maxY, 0]);
}
