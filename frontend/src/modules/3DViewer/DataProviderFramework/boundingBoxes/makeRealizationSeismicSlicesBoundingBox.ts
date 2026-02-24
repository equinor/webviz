import type { BBox } from "@lib/utils/bbox";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    RealizationSeismicSlicesData,
    RealizationSeismicSlicesProviderMeta,
} from "../customDataProviderImplementations/RealizationSeismicSlicesProvider";

export function makeRealizationSeismicSlicesBoundingBox({
    state,
}: TransformerArgs<RealizationSeismicSlicesData, RealizationSeismicSlicesProviderMeta>): BBox | null {
    const seismicCubeMeta = state?.snapshot?.meta.seismicCubeMeta;
    if (!seismicCubeMeta) {
        return null;
    }

    return {
        min: {
            x: seismicCubeMeta.bbox.xmin,
            y: seismicCubeMeta.bbox.ymin,
            z: seismicCubeMeta.bbox.zmin,
        },
        max: {
            x: seismicCubeMeta.bbox.xmax,
            y: seismicCubeMeta.bbox.ymax,
            z: seismicCubeMeta.bbox.zmax,
        },
    };
}
