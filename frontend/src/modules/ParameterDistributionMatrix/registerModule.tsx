import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interface } from "./settingsToViewInterface";
import { State } from "./state";

export const MODULE_NAME = "ParameterDistributionMatrix";

const description = "Plotting of parameter distributions";

ModuleRegistry.registerModule<State, Interface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Parameter Distribution Matrix",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    description,
});
