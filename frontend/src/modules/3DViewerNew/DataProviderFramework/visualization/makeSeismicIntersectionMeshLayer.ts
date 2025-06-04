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
        traceXYPointsArray: new Float32Array(polyline.polylineUtmXy),
        minDepth: fenceData.min_fence_depth,
        maxDepth: fenceData.max_fence_depth,
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
    });
}
