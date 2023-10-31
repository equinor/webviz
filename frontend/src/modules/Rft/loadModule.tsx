import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import State from "./state";
import { view } from "./view";

const defaultState: State = {
    rftWellAddress: null

};

const module = ModuleRegistry.initModule<State>("Rft", defaultState, {

});

module.viewFC = view;
module.settingsFC = settings;
