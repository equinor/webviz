import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = {
    vectorSpec: null,
    timestampUtcMs: null,
    parameterName: undefined,
};

const module = ModuleRegistry.initModule<State>("TimeSeriesParameterDistribution", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
