import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interface, State } from "./state";

ModuleRegistry.registerModule<State, Interface>({
    moduleName: "MyModule2",
    defaultTitle: "My Module 2",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
});
