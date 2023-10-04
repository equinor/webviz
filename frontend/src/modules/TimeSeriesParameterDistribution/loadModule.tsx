import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    vectorSpec: null,
    timestampUtcMs: null,
    parameterName: undefined
};


const module = ModuleRegistry.initModule<State>("TimeSeriesParameterDistribution", defaultState);

module.viewFC = view;
module.settingsFC = settings;
