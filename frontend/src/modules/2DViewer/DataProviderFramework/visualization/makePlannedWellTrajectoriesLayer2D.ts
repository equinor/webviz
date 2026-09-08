import type { WellboreTrajectory_api } from "@api";
import { makePlannedWellTrajectoriesLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makePlannedWellTrajectoriesLayer";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

// In the 2D view, we want to avoid the layer clipping through other layers, so we disable the depth test.
// We also disable the outline: with the depth test off, the (black) outline sublayer would otherwise
// overdraw the colored line and make the planned wells appear black.
export function makePlannedWellTrajectoriesLayer2D(
    args: TransformerArgs<any, WellboreTrajectory_api[], any>,
): ReturnType<typeof makePlannedWellTrajectoriesLayer> {
    const layer = makePlannedWellTrajectoriesLayer(args);

    return layer?.clone({ depthTest: false, outline: false }) ?? null;
}
