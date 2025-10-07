import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "ParameterDistributions";

const description = "Shows the sampled parameter distributions used by ERT";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Parameter Distributions",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    description,
    preview,
});
