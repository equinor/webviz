import { Layer } from "@deck.gl/core";
import { SeismicSliceData_trans } from "@modules/3DViewerNew/settings/queries/queryDataTransforms";
import { VisualizationFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { makeColorMapFunctionFromColorScale } from "@modules/_shared/LayerFramework/visualization/utils/colors";
import { SeismicFenceMeshLayer } from "@modules/_shared/customDeckGlLayers/SeismicFenceMeshLayer/SeismicFenceMeshLayer";

export enum Plane {
    CROSSLINE = "CROSSLINE",
    INLINE = "INLINE",
    DEPTH = "DEPTH",
}

export function makeSeismicFenceMeshLayerFunction(plane: Plane) {
    return function makeSeismicFenceMeshLayer({
        id,
        name,
        data,
        colorScale,
        settings,
        isLoading,
        predictedGeometry,
    }: VisualizationFunctionArgs<any, SeismicSliceData_trans>): Layer<any> {
        let bbox: number[][] = [
            [data.bbox_utm[0][0], data.bbox_utm[0][1], data.u_min],
            [data.bbox_utm[1][0], data.bbox_utm[1][1], data.u_min],
            [data.bbox_utm[0][0], data.bbox_utm[0][1], data.u_max],
            [data.bbox_utm[1][0], data.bbox_utm[1][1], data.u_max],
        ];

        if (plane === Plane.DEPTH) {
            bbox = [
                [data.bbox_utm[0][0], data.bbox_utm[0][1], settings.seismicDepthSlice],
                [data.bbox_utm[3][0], data.bbox_utm[3][1], settings.seismicDepthSlice],
                [data.bbox_utm[1][0], data.bbox_utm[1][1], settings.seismicDepthSlice],
                [data.bbox_utm[2][0], data.bbox_utm[2][1], settings.seismicDepthSlice],
            ];
        }

        return new SeismicFenceMeshLayer({
            id,
            name,
            data: {
                sections: [
                    {
                        boundingBox: bbox,
                        properties: data.dataFloat32Arr,
                        numSamplesU: data.u_num_samples,
                        numSamplesV: data.v_num_samples,
                    },
                ],
            },
            colorMapFunction: makeColorMapFunctionFromColorScale(colorScale, data.value_min, data.value_max, false),
            zIncreaseDownwards: true,
            isLoading,
            loadingGeometry: predictedGeometry ?? undefined,
        });
    };
}
