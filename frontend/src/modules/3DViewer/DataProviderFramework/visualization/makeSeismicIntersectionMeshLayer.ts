import type { Layer } from "@deck.gl/core";

import {
    SeismicFenceMeshLayer,
    type SeismicFence,
} from "@modules/3DViewer/customDeckGlLayers/SeismicFenceMeshLayer/SeismicFenceMeshLayer";
import type {
    IntersectionRealizationSeismicData,
    IntersectionRealizationSeismicProviderMeta,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/IntersectionRealizationSeismicProvider";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

function makeTraceXYZPointsArrayFromPolyline(polylineUtmXy: readonly number[], z: number): Float32Array {
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
    args: TransformerArgs<IntersectionRealizationSeismicData, IntersectionRealizationSeismicProviderMeta>,
): Layer<any> | null {
    const { id, name, state } = args;
    const snapshot = state?.snapshot;
    if (!snapshot) {
        return null;
    }

    const fenceData = snapshot.data;
    const colorScaleSpec = snapshot.meta.colorScale;
    const opacityPercent = snapshot.meta.opacityPercent / 100;
    const valueRange = snapshot.valueRange;
    const polylineUtmXy = snapshot.meta.seismicFencePolylineUtmXy;

    if (!fenceData || !polylineUtmXy.length) {
        return null;
    }

    // Ensure consistency between fetched data and requested polyline
    if (fenceData.num_traces !== polylineUtmXy.length / 2) {
        throw new Error(
            `Number of traces (${fenceData.num_traces}) does not match number of polyline points (${polylineUtmXy.length / 2}) for requested polyline`,
        );
    }

    const fence: SeismicFence = {
        traceXYZPointsArray: new Float32Array(
            makeTraceXYZPointsArrayFromPolyline(polylineUtmXy, fenceData.min_fence_depth),
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
