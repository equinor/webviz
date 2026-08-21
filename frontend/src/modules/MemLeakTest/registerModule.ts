import { ModuleCategory, ModuleDevState, type ModuleInterfaceTypes } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

ModuleRegistry.registerModule<ModuleInterfaceTypes>({
    moduleName: "MemLeakTest",
    defaultTitle: "Memory Leak Test",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description:
        "Diagnostic module for isolating memory retention across the atom store, the TanStack Query cache, and React component state (settings/view) after a module instance is unloaded.",
});
