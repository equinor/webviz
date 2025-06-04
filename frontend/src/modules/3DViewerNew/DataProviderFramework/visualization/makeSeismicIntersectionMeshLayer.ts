import type { Layer } from "@deck.gl/core";
import * as vec3 from "@lib/utils/vec3";
import {
    SeismicFenceMeshLayer,
    type SeismicFenceMeshSectionWithLoadingGeometry,
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

    const sections: SeismicFenceMeshSectionWithLoadingGeometry[] = [];

    let sampleIndex = 0;
    for (let polylinePointIndex = 0; polylinePointIndex < polyline.polylineUtmXy.length - 1; polylinePointIndex += 2) {
        const point = vec3.create(
            polyline.polylineUtmXy[polylinePointIndex * 2],
            polyline.polylineUtmXy[polylinePointIndex * 2 + 1],
            fenceData.min_fence_depth,
        );
        const nextPoint = vec3.create(
            polyline.polylineUtmXy[(polylinePointIndex + 1) * 2],
            polyline.polylineUtmXy[(polylinePointIndex + 1) * 2 + 1],
            fenceData.min_fence_depth,
        );

        const boundingBox = [
            [point.x, point.y, fenceData.min_fence_depth],
            [nextPoint.x, nextPoint.y, fenceData.min_fence_depth],
            [point.x, point.y, fenceData.max_fence_depth],
            [nextPoint.x, nextPoint.y, fenceData.max_fence_depth],
        ];

        sections.push({
            id: `section-${polylinePointIndex}`,
            section: {
                boundingBox,
                properties: fenceData.fenceTracesFloat32Arr.slice(
                    sampleIndex,
                    sampleIndex + fenceData.num_samples_per_trace * 2,
                ),
                propertiesOffset: 0,
                numSamplesU: fenceData.num_samples_per_trace,
                numSamplesV: 2,
            },
        });

        sampleIndex += fenceData.num_samples_per_trace;
    }

    return new SeismicFenceMeshLayer({
        id,
        name,
        data: sections,
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScaleSpec, {
            valueMin: valueRange?.[0] ?? 0,
            valueMax: valueRange?.[1] ?? 0,
            midPoint: 0,
        }),
        zIncreaseDownwards: true,
    });
}
