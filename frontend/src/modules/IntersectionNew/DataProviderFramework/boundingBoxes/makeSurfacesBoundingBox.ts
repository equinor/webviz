import type { BBox } from "@lib/utils/bbox";
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
    const extensionLength = getSetting(Setting.INTERSECTION_EXTENSION_LENGTH);
    const polylineActualSectionLengths = getStoredData("polylineWithSectionLengths")?.actualSectionLengths;

    if (!data || !extensionLength || !polylineActualSectionLengths || isLoading) {
        return null;
    }

    const minX = -extensionLength;
    const maxX = polylineActualSectionLengths.reduce((sum, length) => sum + length, -extensionLength);
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    for (const surface of data) {
        minY = Math.min(minY, ...surface.z_points);
        maxY = Math.max(maxY, ...surface.z_points);
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
