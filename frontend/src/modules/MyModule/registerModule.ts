import { ModuleCategory, ModuleDevState, type ModuleInterfaceTypes } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

ModuleRegistry.registerModule<ModuleInterfaceTypes>({
    moduleName: "MyModule",
    defaultTitle: "My Module",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description: "My module description",
});
