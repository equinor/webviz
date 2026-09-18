import type { Layer } from "@deck.gl/core";

import { IntersectionType } from "@framework/types/intersection";
import {
    SeismicFenceMeshLayer,
    type SeismicFence,
} from "@modules/3DViewer/customDeckGlLayers/SeismicFenceMeshLayer/SeismicFenceMeshLayer";
import type {
    IntersectionSeismicData,
    IntersectionSeismicSettings,
    IntersectionSeismicStoredData,
} from "@modules/_shared/DataProviderFramework/dataProviders/implementations/seismicProviders/IntersectionSeismicProvider";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import { makeFenceSourceId } from "@modules/_shared/utils/fence";

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
    args: TransformerArgs<IntersectionSeismicSettings, IntersectionSeismicData, IntersectionSeismicStoredData>,
): Layer<any> | null {
    const { id, name, getData, getSetting, getStoredData, getDataValueRange } = args;
    const fenceData = getData();
    const colorScaleSpec = getSetting(Setting.COLOR_SCALE);
    const opacityPercent = (getSetting(Setting.OPACITY_PERCENT) ?? 100) / 100;
    const valueRange = getDataValueRange();
    const polyline = getStoredData("seismicFencePolylineWithSectionLengths");
    const sourcePolyline = getStoredData("sourcePolylineWithSectionLengths");
    const intersectionSetting = getSetting(Setting.INTERSECTION);

    if (!fenceData || !polyline || !sourcePolyline || !intersectionSetting) {
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
        sourceFence: {
            id: makeFenceSourceId(intersectionSetting),
            utmXY: sourcePolyline.polylineUtmXy,
            offset: intersectionSetting?.type === IntersectionType.WELLBORE ? intersectionSetting.extensionLength : 0,
        },
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
