import { ModuleRegistry } from "@framework/ModuleRegistry";

import "./atoms";
import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = {
    text: "Hello World",
};

const module = ModuleRegistry.initModule<State>("MyModule2", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
