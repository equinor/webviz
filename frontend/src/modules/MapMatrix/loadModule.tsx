import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings/settings";
import { State, mapMatrixDefaultState } from "./state";
import { view } from "./view/view";

const module = ModuleRegistry.initModule<State>("MapMatrix", mapMatrixDefaultState);

module.viewFC = view;
module.settingsFC = settings;
