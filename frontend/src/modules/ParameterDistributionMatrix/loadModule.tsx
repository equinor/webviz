import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = { ensembleSetParameterIdents: [] };

const module = ModuleRegistry.initModule<State>("ParameterDistributionMatrix", defaultState);

module.viewFC = view;
module.settingsFC = settings;
