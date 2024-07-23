import { isDevMode } from "@lib/utils/devMode";

import "./3DViewer/registerModule";
import "./DistributionPlot/registerModule";
import "./FlowNetwork/registerModule";
// import "./Grid3DVTK/registerModule";
import "./InplaceVolumetrics/registerModule";
import "./Intersection/registerModule";
import "./Map/registerModule";
import "./ParameterDistributionMatrix/registerModule";
import "./Pvt/registerModule";
import "./Rft/registerModule";
import "./SeismicIntersection/registerModule";
import "./SimulationTimeSeries/registerModule";
import "./SimulationTimeSeriesSensitivity/registerModule";
import "./StructuralUncertaintyIntersection/registerModule";
import "./SubsurfaceMap/registerModule";
import "./TornadoChart/registerModule";
import "./WellCompletions/registerModule";

if (isDevMode()) {
    await import("./MyModule/registerModule");
    await import("./MyModule2/registerModule");
    await import("./DbgWorkbenchSpy/registerModule");
}
