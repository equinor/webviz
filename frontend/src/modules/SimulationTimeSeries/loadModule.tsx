import { Frequency_api } from "@api";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = {
    vectorSpec: null,
    resamplingFrequency: Frequency_api.MONTHLY,
    showStatistics: true,
    showRealizations: false,
    showHistorical: true,
    realizationsToInclude: null,
};

const module = ModuleRegistry.initModule<State>("SimulationTimeSeries", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
