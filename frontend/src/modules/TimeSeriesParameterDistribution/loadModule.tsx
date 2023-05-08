import { Frequency } from "@api";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    vectorSpec: null,
    timeStep: null,
    parameterName: undefined,
};

const module = ModuleRegistry.initModule<State>("TimeSeriesParameterDistribution", initialState);

module.viewFC = view;
module.settingsFC = settings;
