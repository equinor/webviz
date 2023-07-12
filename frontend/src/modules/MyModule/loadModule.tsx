import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    count: 0,
};

const module = ModuleRegistry.initModule<State>("MyModule", defaultState);

module.viewFC = view;
module.settingsFC = settings;
