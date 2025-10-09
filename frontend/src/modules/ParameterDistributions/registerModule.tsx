import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "ParameterDistributions";

const description =
    "Shows parameter distributions from ensemble runs. When comparing prior and posterior ensembles, " +
    "advanced sorting options help identify which parameters were most updated by data assimilation.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Parameter Distributions",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    description,
    preview,
});
