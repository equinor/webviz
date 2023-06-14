import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Frequency_api } from "@api";
import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    vectorSpec: null,
    resamplingFrequency: Frequency_api.MONTHLY,
    showStatistics: true,
    realizationsToInclude: null
};


const module = ModuleRegistry.initModule<State>("SimulationTimeSeries", initialState);

module.viewFC = view;
module.settingsFC = settings;
