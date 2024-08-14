import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SettingsToViewInterface, State } from "./state";

ModuleRegistry.registerModule<State, SettingsToViewInterface>({
    moduleName: "MyModule2",
    defaultTitle: "My Module 2",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
});
