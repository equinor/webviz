import type { BBox } from "@lib/utils/bbox";
import type {
    IntersectionRealizationSeismicData,
    IntersectionRealizationSeismicSettings,
    IntersectionRealizationSeismicStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationSeismicProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import { createValidExtensionLength } from "../utils/extensionLengthUtils";

/**
 * Build a bounding box for the intersection seismic data.
 *
 * The intersection uz-coordinates are provided as the xy-coordinates of the bounding box,
 * as they are to be visualized in a 2D view.
 */
export function makeSeismicBoundingBox({
    getData,
    getSetting,
    getStoredData,
    isLoading,
}: TransformerArgs<
    IntersectionRealizationSeismicSettings,
    IntersectionRealizationSeismicData,
    IntersectionRealizationSeismicStoredData,
    any
>): BBox | null {
    const data = getData();
    const polylineActualSectionLengths = getStoredData("sourcePolylineWithSectionLengths")?.actualSectionLengths;
    const extensionLength = createValidExtensionLength(
        getSetting(Setting.INTERSECTION),
        getSetting(Setting.WELLBORE_EXTENSION_LENGTH),
    );

    if (!data || !polylineActualSectionLengths || isLoading) {
        return null;
    }

    const minX = -extensionLength;
    const maxX = polylineActualSectionLengths.reduce((sum, length) => sum + length, -extensionLength);
    const minY = data.min_fence_depth;
    const maxY = data.max_fence_depth;

    return {
        min: {
            x: minX,
            y: minY,
            z: 0.0,
        },
        max: {
            x: maxX,
            y: maxY,
            z: 0.0,
        },
    };
}
