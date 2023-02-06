import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const module = ModuleRegistry.getModule<State>("MyModule");

module.viewFC = view;
module.settingsFC = settings;
