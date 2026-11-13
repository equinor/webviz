import type { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { PlannedWellTrajectoriesTransArgs } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makePlannedWellTrajectoriesLayer";
import { makePlannedWellTrajectoriesLayer } from "@modules/_shared/DataProviderFramework/visualization/deckgl/makePlannedWellTrajectoriesLayer";

export function makePlannedWellTrajectoriesLayer3D(args: PlannedWellTrajectoriesTransArgs): WellsLayer | null {
    return makePlannedWellTrajectoriesLayer(args, { viewMode: "3D" });
}
