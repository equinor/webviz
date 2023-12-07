import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { PlotType, State } from "./state";
import { view } from "./view";

const defaultState: State = {
    plotType: PlotType.BarChart,
    numBins: 10,
    orientation: "h",
};

const module = ModuleRegistry.initModule<State>("DistributionPlot", defaultState);

module.viewFC = view;
module.settingsFC = settings;
