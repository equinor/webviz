import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { RealizationSelection, State } from "./state";
import { view } from "./view";

const initialState: State = {
    ensembleIdent: null,
    realizationSelection: RealizationSelection.Aggregated,
    realizationToInclude: null,
    timeStep: null,
};

const module = ModuleRegistry.initModule<State>("WellCompletion", initialState);

module.viewFC = view;
module.settingsFC = settings;
