import type { WellboreTrajectory_api } from "@api";
import { makeDrilledWellTrajectoriesLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellTrajectoriesLayer";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

// In the 2D view, we want to avoid the layer clipping through other layers.
// The shared visualizer function has all the general settings we want, so
// we just inject an extra prop to disable the depth test.
export function makeDrilledWellTrajectoriesLayer2D(
    args: TransformerArgs<any, WellboreTrajectory_api[], any>,
): ReturnType<typeof makeDrilledWellTrajectoriesLayer> {
    const layer = makeDrilledWellTrajectoriesLayer(args);

    return layer?.clone({ depthTest: false }) ?? null;
}
