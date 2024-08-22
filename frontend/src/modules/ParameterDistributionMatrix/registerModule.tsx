import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";

export const MODULE_NAME = "ParameterDistributionMatrix";

const description = "Plotting of parameter distributions";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Parameter Distribution Matrix",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    description,
});
