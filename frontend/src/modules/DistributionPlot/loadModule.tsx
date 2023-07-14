import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    channelNameX: null,
    channelNameY: null,
    channelNameZ: null,
    plotType: null,
    numBins: 10,
    orientation: "h",
};

const module = ModuleRegistry.initModule<State>("DistributionPlot", defaultState);

module.viewFC = view;
module.settingsFC = settings;
