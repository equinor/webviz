import { Frequency_api } from "@api";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    vectorSpec: null,
    resamplingFrequency: Frequency_api.MONTHLY,
    selectedSensitivities: null,
    showStatistics: true,
    showRealizations: false,
    realizationsToInclude: null,
    showHistorical: true,
};

const module = ModuleRegistry.initModule<State>("SimulationTimeSeriesSensitivity", defaultState);

module.viewFC = view;
module.settingsFC = settings;
