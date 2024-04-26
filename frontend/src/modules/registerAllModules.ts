import { isDevMode } from "@lib/utils/devMode";

import "./DistributionPlot/registerModule";
import "./Grid3D/registerModule";
// import "./Grid3DIntersection/registerModule";
// import "./Grid3DVTK/registerModule";
import "./InplaceVolumetrics/registerModule";
import "./Map/registerModule";
import "./ParameterDistributionMatrix/registerModule";
import "./Pvt/registerModule";
import "./Rft/registerModule";
import "./SeismicIntersection/registerModule";
import "./SimulationTimeSeries/registerModule";
import "./SimulationTimeSeriesMatrix/registerModule";
import "./SimulationTimeSeriesSensitivity/registerModule";
import "./StructuralUncertaintyIntersection/registerModule";
import "./SubsurfaceMap/registerModule";
import "./TimeSeriesParameterDistribution/registerModule";
import "./TornadoChart/registerModule";
import "./WellCompletions/registerModule";

if (isDevMode()) {
    await import("./MyModule/registerModule");
    await import("./MyModule2/registerModule");
    await import("./DbgWorkbenchSpy/registerModule");
}
