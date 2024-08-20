import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "MyModule2",
    defaultTitle: "My Module 2",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
});
