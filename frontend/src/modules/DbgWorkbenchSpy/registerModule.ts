import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "DbgWorkbenchSpy",
    defaultTitle: "Debug Workbench Spy",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
});
