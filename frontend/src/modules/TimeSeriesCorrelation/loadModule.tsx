import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Frequency } from "@api";
import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    vectorSpec: null,
    resamplingFrequency: Frequency.MONTHLY,
    showStatistics: true,
    realizationsToInclude: null,
    timeStep: null,
    parameterName: undefined
};


const module = ModuleRegistry.initModule<State>("TimeSeriesCorrelation", initialState);

module.viewFC = view;
module.settingsFC = settings;
