import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    ensembleName: null,
    parameterName: null,
};


const module = ModuleRegistry.initModule<State>("ParameterAnalysis", initialState);

module.viewFC = view;
module.settingsFC = settings;
