import { isDevMode } from "@lib/utils/devMode";

import "./DistributionPlot/registerModule";
import "./Grid3D/registerModule";
import "./Grid3D/registerModule";
import "./Grid3DIntersection/registerModule";
import "./Grid3DIntersection/registerModule";
import "./InplaceVolumetrics/registerModule";
import "./Map/registerModule";
import "./Pvt/registerModule";
import "./Sensitivity/registerModule";
import "./SimulationTimeSeries/registerModule";
import "./WellCompletion/registerModule"
import "./SimulationTimeSeriesSensitivity/registerModule";
import "./TimeSeriesParameterDistribution/registerModule";

if (isDevMode()) {
    import("./MyModule2/registerModule");
    import("./MyModule/registerModule");
    import("./DbgWorkbenchSpy/registerModule");
}
