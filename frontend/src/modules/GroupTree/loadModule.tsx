import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State, StatisticsOrRealization } from "./state";
import { view } from "./view";

const initialState: State = {
    ensembleIdent: null,
    statOrReal: StatisticsOrRealization.Realization,
    realization: 0
};

const module = ModuleRegistry.initModule<State>("GroupTree", initialState);

module.viewFC = view;
module.settingsFC = settings;