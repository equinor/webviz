import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = { ensembleSetParameterIdents: [] };

const module = ModuleRegistry.initModule<State>("ParameterDistributionMatrix", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
