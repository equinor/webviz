import { Frequency_api } from "@api";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    vectorSpec: null,
    resamplingFrequency: Frequency_api.MONTHLY,
    selectedSensitivity: null,
    showStatistics: true,
    showRealizations: false,
    realizationsToInclude: null,
};

const module = ModuleRegistry.initModule<State>("SimulationTimeSeriesSensitivity", initialState);

module.viewFC = view;
module.settingsFC = settings;
