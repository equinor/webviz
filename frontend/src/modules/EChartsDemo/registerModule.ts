import { ModuleCategory, ModuleDevState, type ModuleInterfaceTypes } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

ModuleRegistry.registerModule<ModuleInterfaceTypes>({
    moduleName: "EChartsDemo",
    defaultTitle: "ECharts Demo",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description: "ECharts demo module",
});
