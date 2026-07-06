import { ModuleCategory, ModuleDevState, type ModuleInterfaceTypes } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

export const MODULE_NAME = "TemplateModule";

ModuleRegistry.registerModule<ModuleInterfaceTypes>({
    moduleName: MODULE_NAME,
    defaultTitle: "Template Module",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description:
        "A module template to get you started with building your own module. This module doesn't do anything, but it can be used as a starting point for your own module development.",
});
