import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "FormComponents",
    defaultTitle: "Form components",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,

    // Runs whenever you cross out a module
    onInstanceUnload(instanceId: string) {
        // eslint-disable-next-line no-console
        console.log(`Moduel instance ${instanceId} is unloading...`);
    },
});
