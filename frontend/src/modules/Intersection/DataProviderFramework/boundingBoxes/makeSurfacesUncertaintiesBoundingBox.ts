import { fromNumArray, type BBox } from "@lib/utils/bbox";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    SurfacesPerRealizationValuesData,
    SurfacesPerRealizationValuesSettings,
    SurfacesPerRealizationValuesStoredData,
} from "../customDataProviderImplementations/SurfacesPerRealizationValuesProvider";
import { createValidExtensionLength } from "../utils/extensionLengthUtils";

/**
 * Build a bounding box for the intersection surfaces realizations uncertainty data.
 *
 * The intersection uz-coordinates are provided as the xy-coordinates of the bounding box,
 * as they are to be visualized in a 2D view.
 */
export function makeSurfacesUncertaintiesBoundingBox({
    getData,
    getSetting,
    getStoredData,
    isLoading,
}: TransformerArgs<
    SurfacesPerRealizationValuesSettings,
    SurfacesPerRealizationValuesData,
    SurfacesPerRealizationValuesStoredData,
    any
>): BBox | null {
    const data = getData();
    const cumulatedHorizontalPolylineLengthArr = getStoredData(
        "requestedPolylineWithCumulatedLengths",
    )?.cumulatedHorizontalPolylineLengthArr;
    const extensionLength = createValidExtensionLength(
        getSetting(Setting.INTERSECTION),
        getSetting(Setting.WELLBORE_EXTENSION_LENGTH),
    );

    if (!data || !cumulatedHorizontalPolylineLengthArr || isLoading) {
        return null;
    }

    const minX = -extensionLength;
    const maxX = -minX + cumulatedHorizontalPolylineLengthArr[cumulatedHorizontalPolylineLengthArr.length - 1];

    const numSurfaces = Object.keys(data).length;

    // If no surfaces, return a bounding box with only the x-coordinates
    if (numSurfaces === 0) {
        return fromNumArray([minX, 0, 0, maxX, 0, 0]);
    }

    // Find the min and max z-coordinates of all surfaces
    let minY = Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
    for (const perRealizationValues of Object.values(data)) {
        for (const realizationValues of perRealizationValues) {
            const sampledValues = realizationValues.sampled_values;
            if (sampledValues.length === 0) {
                continue;
            }

            minY = realizationValues.sampled_values.reduce((acc, value) => Math.min(acc, value), minY);
            maxY = realizationValues.sampled_values.reduce((acc, value) => Math.max(acc, value), maxY);
        }
    }

    return fromNumArray([minX, minY, 0, maxX, maxY, 0]);
}
