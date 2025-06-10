import type { BBox } from "@lib/utils/bbox";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";
import type {
    RealizationSeismicSlicesData,
    RealizationSeismicSlicesStoredData,
} from "../customDataProviderImplementations/RealizationSeismicSlicesProvider";

export function makeRealizationSeismicSlicesBoundingBox({
    getStoredData,
}: TransformerArgs<any, RealizationSeismicSlicesData, RealizationSeismicSlicesStoredData>): BBox | null {
    const seismicCubeMeta = getStoredData("seismicCubeMeta");
    if (!seismicCubeMeta) {
        return null;
    }

    return {
        min: {
            x: seismicCubeMeta.bbox.xmin,
            y: seismicCubeMeta.bbox.ymin,
            z: -seismicCubeMeta.bbox.zmin,
        },
        max: {
            x: seismicCubeMeta.bbox.xmax,
            y: seismicCubeMeta.bbox.ymax,
            z: -seismicCubeMeta.bbox.zmax,
        },
    };
}
