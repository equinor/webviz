import { WellboreTrajectory_api } from "@api";
import { BBox } from "@lib/utils/bbox";
import { MakeLayerBoundingBoxFunctionArgs } from "@modules/_shared/LayerFramework/visualization/VisualizationFactory";

export function makeDrilledWellTrajectoriesBoundingBox({
    getData,
}: MakeLayerBoundingBoxFunctionArgs<any, WellboreTrajectory_api[]>): BBox | null {
    const data = getData();
    if (!data) {
        return null;
    }

    const bbox: BBox = {
        min: {
            x: Number.MAX_SAFE_INTEGER,
            y: Number.MAX_SAFE_INTEGER,
            z: Number.MAX_SAFE_INTEGER,
        },
        max: {
            x: Number.MIN_SAFE_INTEGER,
            y: Number.MIN_SAFE_INTEGER,
            z: Number.MIN_SAFE_INTEGER,
        },
    };

    for (const trajectory of data) {
        for (const point of trajectory.eastingArr) {
            bbox.min.x = Math.min(bbox.min.x, point);
            bbox.max.x = Math.max(bbox.max.x, point);
        }

        for (const point of trajectory.northingArr) {
            bbox.min.y = Math.min(bbox.min.y, point);
            bbox.max.y = Math.max(bbox.max.y, point);
        }

        for (const point of trajectory.tvdMslArr) {
            bbox.min.z = Math.min(bbox.min.z, point);
            bbox.max.z = Math.max(bbox.max.z, point);
        }
    }

    return bbox;
}
