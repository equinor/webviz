import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    count: 0,
};

const module = ModuleRegistry.initModule<State>("MyModule", initialState);

module.viewFC = view;
module.settingsFC = settings;
