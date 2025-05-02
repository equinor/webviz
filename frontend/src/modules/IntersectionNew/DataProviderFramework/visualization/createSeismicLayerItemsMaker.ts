import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";

import { LayerType } from "@modules/_shared/components/EsvIntersection";
import type {
    IntersectionRealizationSeismicData,
    IntersectionRealizationSeismicSettings,
    IntersectionRealizationSeismicStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationSeismicProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    EsvLayerItemsMaker,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import { seismicColorScaleValues } from "../utils.ts/colorScaleUtils";

/**
 * Make a trajectory in the uz-plane of a fence made from a polyline in the xy-plane of a
 * seismic cube in the xyz-coordinate system.
 *
 * This implies common z-coordinate, and the u-coordinate is the projection - i.e. the distance
 * along the polyline in the xy-plane.
 */
function makeTrajectoryFenceProjectionFromFenceActualSectionLengths(
    actualFenceSectionLengths: number[],
    extensionLength: number,
): number[][] {
    if (actualFenceSectionLengths.length === 0) {
        return [];
    }

    // Calculate uz projection of the trajectory
    const trajectoryFenceProjection: number[][] = [];

    let u = -extensionLength;
    trajectoryFenceProjection.push([u, 0]);

    for (const sectionLength of actualFenceSectionLengths) {
        // Calculate new u projection value
        u += sectionLength;
        trajectoryFenceProjection.push([u, 0]);
    }

    return trajectoryFenceProjection;
}

export function createSeismicLayerItemsMaker({
    id,
    getData,
    getSetting,
    getStoredData,
    getValueRange,
    isLoading,
    name,
}: TransformerArgs<
    IntersectionRealizationSeismicSettings,
    IntersectionRealizationSeismicData,
    IntersectionRealizationSeismicStoredData,
    any
>): EsvLayerItemsMaker | null {
    const fenceData = getData();
    const colorScale = getSetting(Setting.COLOR_SCALE)?.colorScale;
    const useCustomColorScaleBoundaries = getSetting(Setting.COLOR_SCALE)?.areBoundariesUserDefined ?? false;
    const intersectionExtensionLength = getSetting(Setting.INTERSECTION_EXTENSION_LENGTH) ?? 0;
    const attribute = getSetting(Setting.ATTRIBUTE);
    const valueRange = getValueRange();

    const seismicFenceSectionLengths = getStoredData("seismicFencePolylineWithSectionLengths")?.actualSectionLengths;

    if (!fenceData || !seismicFenceSectionLengths || !colorScale || isLoading || !valueRange) {
        return null;
    }

    // Ensure consistency between fetched data and requested polyline
    if (fenceData.num_traces !== seismicFenceSectionLengths.length + 1) {
        throw new Error(
            `Number of traces (${fenceData.num_traces}) does not match number of sections (${seismicFenceSectionLengths.length + 1}) for requested polyline`,
        );
    }

    // Create projection of polyline onto the fence (uz-plane) with actual section lengths
    const trajectoryFenceProjection = makeTrajectoryFenceProjectionFromFenceActualSectionLengths(
        seismicFenceSectionLengths,
        intersectionExtensionLength,
    );

    const adjustedColorScale = colorScale.clone();
    if (!useCustomColorScaleBoundaries) {
        const { min, max, mid } = seismicColorScaleValues(valueRange);
        adjustedColorScale.setRangeAndMidPoint(min, max, mid);
    }

    // The layer has to be created inside EsvIntersection, so we need to return a LayerItem
    const intersectionSeismicLayerItemsMaker: EsvLayerItemsMaker = {
        makeLayerItems: (intersectionReferenceSystem: IntersectionReferenceSystem | null) => {
            void intersectionReferenceSystem; // Not used for this layer

            if (isLoading) {
                // TODO: Add gray layer when loading
                return [];
            }

            return [
                {
                    id: `${id}-seismic-layer`,
                    name: name,
                    type: LayerType.SEISMIC,
                    options: {
                        data: {
                            propertyName: attribute ?? "",
                            propertyUnit: "",
                            minFenceDepth: fenceData.min_fence_depth,
                            maxFenceDepth: fenceData.max_fence_depth,
                            numSamplesPerTrace: fenceData.num_samples_per_trace,
                            numTraces: fenceData.num_traces,
                            fenceTracesArray: fenceData.fenceTracesFloat32Arr,
                            trajectoryFenceProjection: trajectoryFenceProjection,
                            colorScale: adjustedColorScale,
                        },
                    },
                    hoverable: true,
                },
            ];
        },
    };

    return intersectionSeismicLayerItemsMaker;
}
