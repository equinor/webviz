import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings/settings";
import { State, defaultState } from "./state";
import { view } from "./view/view";

const module = ModuleRegistry.initModule<State>("MapMatrix", defaultState);

module.viewFC = view;
module.settingsFC = settings;
