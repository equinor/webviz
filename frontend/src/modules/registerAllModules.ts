import { isDevMode } from "@lib/utils/devMode";

import "./DistributionPlot/registerModule";
import "./Grid3D/registerModule";
import "./Grid3D/registerModule";
import "./Grid3DIntersection/registerModule";
import "./Grid3DIntersection/registerModule";
import "./InplaceVolumetrics/registerModule";
import "./Intersection/registerModule";
import "./Pvt/registerModule";
import "./Sensitivity/registerModule";
import "./SimulationTimeSeriesMatrix/registerModule";
import "./SimulationTimeSeriesSensitivity/registerModule";
import "./SubsurfaceMap/registerModule";
import "./WellCompletion/registerModule";

if (isDevMode()) {
    await import("./MyModule/registerModule");
    await import("./MyModule2/registerModule");
    await import("./DbgWorkbenchSpy/registerModule");
    await import("./Map/registerModule");
    await import("./TimeSeriesParameterDistribution/registerModule");
    await import("./SimulationTimeSeries/registerModule");
}
