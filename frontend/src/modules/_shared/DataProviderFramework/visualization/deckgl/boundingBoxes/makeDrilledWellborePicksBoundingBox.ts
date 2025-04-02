import type { BBox } from "@lib/utils/bbox";
import type { FactoryFunctionArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    DrilledWellborePicksData,
    DrilledWellborePicksSettings,
} from "../../../dataProviders/implementations/DrilledWellborePicks";

export function makeDrilledWellborePicksBoundingBox({
    getData,
}: FactoryFunctionArgs<DrilledWellborePicksSettings, DrilledWellborePicksData>): BBox | null {
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
        bbox.min.x = Math.min(bbox.min.x, trajectory.easting);
        bbox.max.x = Math.max(bbox.max.x, trajectory.easting);

        bbox.min.y = Math.min(bbox.min.y, trajectory.northing);
        bbox.max.y = Math.max(bbox.max.y, trajectory.northing);

        bbox.min.z = Math.min(bbox.min.z, trajectory.tvdMsl);
        bbox.max.z = Math.max(bbox.max.z, trajectory.tvdMsl);
    }

    return bbox;
}
