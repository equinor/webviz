import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Frequency } from "@api";
import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    ensembleName: null,
    vectorName: null,
    resamplingFrequency: Frequency.MONTHLY,
    showStatistics: true,
    realizationsToInclude: null
};


const module = ModuleRegistry.initModule<State>("SimulationTimeSeries", initialState);

module.viewFC = view;
module.settingsFC = settings;
