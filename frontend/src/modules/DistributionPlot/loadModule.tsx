import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { DisplayMode, PlotType, State } from "./state";
import { view } from "./view";

const defaultState: State = {
    plotType: PlotType.Histogram,
    numBins: 10,
    orientation: "h",
    displayMode: DisplayMode.PlotMatrix,
};

const module = ModuleRegistry.initModule<State>("DistributionPlot", defaultState);

module.viewFC = view;
module.settingsFC = settings;
