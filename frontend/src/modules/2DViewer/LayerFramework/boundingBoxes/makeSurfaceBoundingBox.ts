import { SurfaceDataPng_api } from "@api";
import { BBox } from "@lib/utils/bbox";
import { MakeLayerBoundingBoxFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";
import { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";

export function makeSurfaceLayerBoundingBox({
    getData,
}: MakeLayerBoundingBoxFunctionArgs<any, SurfaceDataFloat_trans | SurfaceDataPng_api>): BBox | null {
    const data = getData();
    if (!data) {
        return null;
    }

    return {
        min: {
            x: data.transformed_bbox_utm.min_x,
            y: data.transformed_bbox_utm.min_y,
            z: 0,
        },
        max: {
            x: data.transformed_bbox_utm.max_x,
            y: data.transformed_bbox_utm.max_y,
            z: 0,
        },
    };
}
