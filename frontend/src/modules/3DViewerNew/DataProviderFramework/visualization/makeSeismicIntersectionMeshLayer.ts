import type { Layer } from "@deck.gl/core";
import {
    SeismicFenceMeshLayer,
    type SeismicFence,
} from "@modules/3DViewerNew/customDeckGlLayers/SeismicFenceMeshLayer/SeismicFenceMeshLayer";
import type {
    IntersectionRealizationSeismicData,
    IntersectionRealizationSeismicSettings,
    IntersectionRealizationSeismicStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationSeismicProvider";

import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

function makeTraceXYZPointsArrayFromPolyline(polylineUtmXy: number[], z: number): Float32Array {
    if (polylineUtmXy.length % 2 !== 0) {
        throw new Error("Polyline UTM XY coordinates must be in pairs (x, y).");
    }
    const traceXYZPointsArray = new Float32Array((polylineUtmXy.length / 2) * 3);
    for (let i = 0; i < polylineUtmXy.length; i += 2) {
        const index = (i / 2) * 3;
        traceXYZPointsArray[index] = polylineUtmXy[i]; // x
        traceXYZPointsArray[index + 1] = polylineUtmXy[i + 1]; // y
        traceXYZPointsArray[index + 2] = z; // z, set to 0 as we don't have depth info here
    }
    return traceXYZPointsArray;
}

export function makeSeismicIntersectionMeshLayer(
    args: TransformerArgs<
        IntersectionRealizationSeismicSettings,
        IntersectionRealizationSeismicData,
        IntersectionRealizationSeismicStoredData
    >,
): Layer<any> | null {
    const { id, name, getData, getSetting, getStoredData, getValueRange } = args;
    const fenceData = getData();
    const colorScaleSpec = getSetting(Setting.COLOR_SCALE);
    const opacityPercent = (getSetting(Setting.OPACITY_PERCENT) ?? 100) / 100;
    const valueRange = getValueRange();
    const polyline = getStoredData("seismicFencePolylineWithSectionLengths");

    if (!fenceData || !polyline) {
        return null;
    }

    // Ensure consistency between fetched data and requested polyline
    if (fenceData.num_traces !== polyline.polylineUtmXy.length / 2) {
        throw new Error(
            `Number of traces (${fenceData.num_traces}) does not match number of polyline points (${polyline.polylineUtmXy.length / 2}) for requested polyline`,
        );
    }

    const fence: SeismicFence = {
        traceXYZPointsArray: new Float32Array(
            makeTraceXYZPointsArrayFromPolyline(polyline.polylineUtmXy, fenceData.min_fence_depth),
        ),
        vVector: [0, 0, fenceData.max_fence_depth - fenceData.min_fence_depth],
        numSamples: fenceData.num_samples_per_trace,
        properties: fenceData.fenceTracesFloat32Arr,
    };

    return new SeismicFenceMeshLayer({
        id,
        name,
        data: fence,
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScaleSpec, {
            valueMin: valueRange?.[0] ?? 0,
            valueMax: valueRange?.[1] ?? 0,
            midPoint: 0,
        }),
        zIncreaseDownwards: true,
        opacity: opacityPercent,
    });
}
