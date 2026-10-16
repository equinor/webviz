import { ModuleCategory, ModuleDevState, type ModuleInterfaceTypes } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

ModuleRegistry.registerModule<ModuleInterfaceTypes>({
    moduleName: "DbgPerformanceTest",
    defaultTitle: "Debug Performance Test",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description:
        "Diagnostic playground for performance investigations: allocate dummy data across the atom store, the " +
        "TanStack Query cache, and React component state to isolate memory retention after a module instance is " +
        "unloaded, and fire long-running requests against the backend dev endpoint to exercise slow-response handling.",
});
