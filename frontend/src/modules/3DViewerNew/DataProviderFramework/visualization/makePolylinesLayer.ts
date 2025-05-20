import { PolylinesLayer } from "@modules/3DViewerNew/customDeckGlLayers/PolylinesLayer";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { PolylinesData } from "../customDataProviderImplementations/PolylinesProvider";

export function makePolylinesLayer(args: TransformerArgs<any, PolylinesData>): PolylinesLayer | null {
    const { id, getData, name } = args;

    const polylines = getData();

    if (!polylines) {
        return null;
    }

    const polylinesLayer = new PolylinesLayer({
        id: `${id}-polylines-layer`,
        name,
        polylines,
    });

    return polylinesLayer;
}
