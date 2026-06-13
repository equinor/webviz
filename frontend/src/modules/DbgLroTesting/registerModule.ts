import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "DbgLroTesting",
    defaultTitle: "Dbg LRO Testing",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
});
