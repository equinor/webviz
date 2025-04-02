import type { PolygonData_api } from "@api";
import type { BBox } from "@lib/utils/bbox";
import type { FactoryFunctionArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

export function makePolygonDataBoundingBox({ getData }: FactoryFunctionArgs<any, PolygonData_api[]>): BBox | null {
    const data = getData();
    if (!data) {
        return null;
    }

    const bbox: BBox = {
        min: {
            x: Infinity,
            y: Infinity,
            z: Infinity,
        },
        max: {
            x: -Infinity,
            y: -Infinity,
            z: -Infinity,
        },
    };

    for (const polygon of data) {
        for (const point of polygon.x_arr) {
            bbox.min.x = Math.min(bbox.min.x, point);
            bbox.max.x = Math.max(bbox.max.x, point);
        }
        for (const point of polygon.y_arr) {
            bbox.min.y = Math.min(bbox.min.y, point);
            bbox.max.y = Math.max(bbox.max.y, point);
        }
        for (const point of polygon.z_arr) {
            bbox.min.z = Math.min(bbox.min.z, point);
            bbox.max.z = Math.max(bbox.max.z, point);
        }
    }

    return bbox;
}
