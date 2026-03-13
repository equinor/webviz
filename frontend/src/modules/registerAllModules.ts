import { debugFlagIsEnabled, SHOW_DEBUG_MODULES_FLAG } from "@framework/utils/debug";
import { isDevMode } from "@lib/utils/devMode";

import "./2DViewer/registerModule";
import "./3DViewer/registerModule";
import "./DistributionPlot/registerModule";
import "./FlowNetwork/registerModule";
import "./InplaceVolumesNew/registerModule";
import "./InplaceVolumesPlot/registerModule";
import "./InplaceVolumesTable/registerModule";
import "./Intersection/registerModule";
import "./ParameterDistributions/registerModule";
import "./ParameterResponseCorrelationParallelCoordsPlot/registerModule";
import "./ParameterResponseCorrelationBarPlot/registerModule";
import "./ParameterResponseCorrelationMatrixPlot/registerModule";
import "./ParameterResponseCrossPlot/registerModule";
import "./Pvt/registerModule";
import "./Rft/registerModule";
import "./SimulationTimeSeries/registerModule";
import "./SimulationTimeSeriesSensitivity/registerModule";
import "./SensitivityPlot/registerModule";
import "./Vfp/registerModule";
import "./WellCompletions/registerModule";
import "./WellLogViewer/registerModule";

// IIFE to allow use of await
(async function registerDebugModules() {
    if (isDevMode() || debugFlagIsEnabled(SHOW_DEBUG_MODULES_FLAG)) {
        await import("./Map/registerModule");
        await import("./SubsurfaceMap/registerModule");
        await import("./MyModule/registerModule");
        await import("./MyModule2/registerModule");
        await import("./DbgWorkbenchSpy/registerModule");
    }
})();
