import { Frequency_api } from "@api";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    vectorSpec: null,
    resamplingFrequency: Frequency_api.MONTHLY,
    showStatistics: true,
    realizationsToInclude: null,
};

const module = ModuleRegistry.initModule<State>("SimulationTimeSeries", defaultState);

module.viewFC = view;
module.settingsFC = settings;
