import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { PlotType, State } from "./state";
import { View } from "./view";

const defaultState: State = {
    plotType: PlotType.Histogram,
    numBins: 10,
    orientation: "h",
};

const module = ModuleRegistry.initModule<State>("DistributionPlot", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
