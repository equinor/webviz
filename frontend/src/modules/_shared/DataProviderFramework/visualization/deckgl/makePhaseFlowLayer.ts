import type { GridCellFluxSettings } from "@modules/3DViewer/DataProviderFramework/customDataProviderImplementations/RealizationGridCellFluxFlowProvider";
import { GridPhaseFluxFlowLayer } from "@modules/_shared/customDeckGlLayers/GridPhaseFluxFlowLayer";
import type { Phase } from "@modules/_shared/types/grid";

import { Setting } from "../../settings/settingsDefinitions";
import type { GridCellFluxData } from "../utils/types";
import type { TransformerArgs } from "../VisualizationAssembler";

export function makePhaseFlowLayer(args: TransformerArgs<GridCellFluxSettings, GridCellFluxData>) {
    const data = args.getData();
    const phase = args.getSetting(Setting.PHASE) ?? "oil";
    const showIndices = args.getSetting(Setting.SHOW_CELL_INDICES) ?? false;
    const showWireFrame = args.getSetting(Setting.SHOW_GRID_LINES) ?? false;
    const showVelocity = args.getSetting(Setting.SHOW_CELL_VELOCITY) ?? false;

    return new GridPhaseFluxFlowLayer({
        data: data,
        phase: phase as Phase,
        // velocityScale: 1,
        debug: { wireframe: showWireFrame, index: showIndices, neighborIndex: showIndices, velocity: showVelocity },
    });
}
