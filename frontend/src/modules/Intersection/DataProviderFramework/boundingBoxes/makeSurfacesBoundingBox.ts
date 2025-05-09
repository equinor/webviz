import { fromNumArray, type BBox } from "@lib/utils/bbox";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    RealizationSurfacesData,
    RealizationSurfacesSettings,
    RealizationSurfacesStoredData,
} from "../customDataProviderImplementations/RealizationSurfacesProvider";

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
    const extensionLength = getSetting(Setting.WELLBORE_EXTENSION_LENGTH) ?? 0;
    const polylineActualSectionLengths = getStoredData("polylineWithSectionLengths")?.actualSectionLengths;

    if (!data || !polylineActualSectionLengths || isLoading) {
        return null;
    }

    const minX = -extensionLength;
    const maxX = polylineActualSectionLengths.reduce((sum, length) => sum + length, -extensionLength);

    // If no surfaces, return a bounding box with only the x-coordinates
    if (data.length === 0) {
        return fromNumArray([minX, 0, 0, maxX, 0, 0]);
    }

    let minY = Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
    for (const surface of data) {
        minY = Math.min(minY, ...surface.z_points);
        maxY = Math.max(maxY, ...surface.z_points);
    }

    return fromNumArray([minX, minY, 0, maxX, maxY, 0]);
}
