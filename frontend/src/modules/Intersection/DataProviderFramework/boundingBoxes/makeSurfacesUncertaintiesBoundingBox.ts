import { fromNumArray, type BBox } from "@lib/utils/bbox";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    SurfacesPerRealizationValuesData,
    SurfacesPerRealizationValuesSettings,
    SurfacesPerRealizationValuesStoredData,
} from "../customDataProviderImplementations/SurfacesPerRealizationValuesProvider";

/**
 * Build a bounding box for the intersection surfaces realizations uncertainty data.
 *
 * The intersection uz-coordinates are provided as the xy-coordinates of the bounding box,
 * as they are to be visualized in a 2D view.
 */
export function makeSurfacesUncertaintiesBoundingBox({
    getData,
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

    if (!data || !cumulatedHorizontalPolylineLengthArr || isLoading) {
        return null;
    }

    // If no surfaces, return a bounding box with only the x-coordinates
    const numSurfaces = Object.keys(data).length;
    if (numSurfaces === 0) {
        return null;
    }

    // Find the minimum and maximum coordinates (uz-coordinates) across all surfaces
    let minX = Number.MAX_VALUE;
    let maxX = -Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
    for (const perRealizationValues of Object.values(data)) {
        for (const realizationValues of perRealizationValues) {
            if (realizationValues.sampled_values.length !== cumulatedHorizontalPolylineLengthArr.length) {
                throw new Error(
                    "Length of requested polyline cumulated lengths does not match the length of received sampled values",
                );
            }

            // Find min/max values for realization surface
            for (const [index, zValue] of realizationValues.sampled_values.entries()) {
                // Skip invalid points, e.g. points outside of surface
                if (zValue === null || zValue === undefined) {
                    continue;
                }

                minX = Math.min(minX, cumulatedHorizontalPolylineLengthArr[index]);
                maxX = Math.max(maxX, cumulatedHorizontalPolylineLengthArr[index]);
                minY = Math.min(minY, zValue);
                maxY = Math.max(maxY, zValue);
            }
        }
    }

    return fromNumArray([minX, minY, 0, maxX, maxY, 0]);
}
