import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "DbgWorkbenchSpy",
    defaultTitle: "Debug Workbench Spy",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
});
