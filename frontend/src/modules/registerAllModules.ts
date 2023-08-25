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
import "./SimulationTimeSeriesSensitivity/registerModule";
import "./TimeSeriesParameterDistribution/registerModule";
import "./TopographicMap/registerModule";

if (isDevMode()) {
    await import("./MyModule/registerModule");
    await import("./MyModule2/registerModule");
    await import("./DbgWorkbenchSpy/registerModule");
}
