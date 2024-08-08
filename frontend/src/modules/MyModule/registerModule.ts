import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "MyModule",
    defaultTitle: "My Module",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description: "My module description",
});
