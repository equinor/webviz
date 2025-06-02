import type { Layer } from "@deck.gl/core";

import { type Geometry } from "@lib/utils/geometry";
import { SeismicFenceMeshLayer } from "@modules/3DViewerNew/customDeckGlLayers/SeismicFenceMeshLayer/SeismicFenceMeshLayer";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/DataProviderFramework/visualization/utils/colors";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { SeismicSliceData_trans } from "../utils/transformSeismicSlice";
import type { RealizationSeismicSlicesStoredData } from "../customDataProviderImplementations/RealizationSeismicSlicesProvider";

export function makeSeismicFenceMeshLayer(
    args: TransformerArgs<any, SeismicSliceData_trans, RealizationSeismicSlicesStoredData>,
): Layer<any> | null {
    const { id, name, getData, getSetting, getStoredData, isLoading } = args;
    const data = getData();
    const colorScaleSpec = getSetting(Setting.COLOR_SCALE);
    const slices = getSetting(Setting.SEISMIC_SLICES);
    const seismicCubeMeta = getStoredData("seismicCubeMeta");
    const attribute = getSetting(Setting.ATTRIBUTE);
    const timeOrInterval = getSetting(Setting.TIME_OR_INTERVAL);
    const omitColor = getSetting(Setting.OMIT_COLOR);
    const omitRange = getSetting(Setting.OMIT_RANGE);

    if (!data || !seismicCubeMeta) {
        return null;
    }

    let bbox: number[][] = [
        [data.bbox_utm[0][0], data.bbox_utm[0][1], data.u_min],
        [data.bbox_utm[1][0], data.bbox_utm[1][1], data.u_min],
        [data.bbox_utm[0][0], data.bbox_utm[0][1], data.u_max],
        [data.bbox_utm[1][0], data.bbox_utm[1][1], data.u_max],
    ];

    let predictedGeometry: Geometry | null = null;

    bbox = [
        [data.bbox_utm[0][0], data.bbox_utm[0][1], slices[2] ?? 0],
        [data.bbox_utm[3][0], data.bbox_utm[3][1], slices[2] ?? 0],
        [data.bbox_utm[1][0], data.bbox_utm[1][1], slices[2] ?? 0],
        [data.bbox_utm[2][0], data.bbox_utm[2][1], slices[2] ?? 0],
    ];

    predictedGeometry = predictDepthSliceGeometry(seismicCubeMeta, slices[2] ?? null, attribute, timeOrInterval);

    return new SeismicFenceMeshLayer({
        id,
        name,
        data: {
            sections: [
                {
                    boundingBox: bbox,
                    properties: data.dataFloat32Arr,
                    propertiesOffset: 0,
                    numSamplesU: data.u_num_samples,
                    numSamplesV: data.v_num_samples,
                },
            ],
        },
        colorMapFunction: makeColorMapFunctionFromColorScale(colorScaleSpec, {
            valueMin: data.value_min,
            valueMax: data.value_max,
            midPoint: 0,
            specialColor: {
                color: omitColor ?? "#000000",
                range: omitRange ?? [0, 0],
            },
        }),
        zIncreaseDownwards: true,
        isLoading,
        opacity: 0.5,
        loadingGeometry: predictedGeometry ?? undefined,
    });
}
