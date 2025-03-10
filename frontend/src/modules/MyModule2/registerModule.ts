import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "MyModule2",
    defaultTitle: "My Module 2",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,

    // Runs whenever you cross out a module
    onInstanceUnload(instanceId: string) {
        // eslint-disable-next-line no-console
        console.log(`Moduel instance ${instanceId} is unloading...`);
    },
});
