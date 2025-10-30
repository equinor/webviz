import { GL } from "@luma.gl/constants";

import type { WellborePick_api } from "@api";
import { makeDrilledWellborePicksLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makeDrilledWellborePicksLayer";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

// In the 2D view, we want to avoid the layer clipping through other layers.
// The shared visualizer function has all the general settings we want, so
// we just inject an extra prop to disable the depth test.
export function makeDrilledWellborePicksLayer2D(
    args: TransformerArgs<any, WellborePick_api[], any>,
): ReturnType<typeof makeDrilledWellborePicksLayer> {
    const layer = makeDrilledWellborePicksLayer(args);

    // @ts-expect-error -- Depth test param isn't exposed in type, but it does get correctly applied
    return layer?.clone({ parameters: { ...layer.props.parameters, [GL.DEPTH_TEST]: false } }) ?? null;
}
