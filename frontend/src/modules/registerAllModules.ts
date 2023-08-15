import { isDevMode } from "@lib/utils/devMode";

import "./DbgWorkbenchSpy/registerModule";
import "./DistributionPlot/registerModule";
import "./Grid3D/registerModule";
import "./Grid3D/registerModule";
import "./Grid3DIntersection/registerModule";
import "./Grid3DIntersection/registerModule";
import "./InplaceVolumetrics/registerModule";
import "./Map/registerModule";
import "./MyModule2/registerModule";
import "./MyModule/registerModule";
import "./Pvt/registerModule";
import "./Sensitivity/registerModule";
import "./SimulationTimeSeries/registerModule";
import "./SimulationTimeSeriesSensitivity/registerModule";
import "./TimeSeriesParameterDistribution/registerModule";

if (isDevMode()) {
    await import("./MyModule/registerModule");
    await import("./MyModule2/registerModule");
    await import("./DbgWorkbenchSpy/registerModule");
}
