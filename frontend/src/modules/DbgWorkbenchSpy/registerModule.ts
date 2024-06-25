import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SharedState } from "./implementation";

ModuleRegistry.registerModule<SharedState>({
    moduleName: "DbgWorkbenchSpy",
    defaultTitle: "Debug Workbench Spy",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
});
