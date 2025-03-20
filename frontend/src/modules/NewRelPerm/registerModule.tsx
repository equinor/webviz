import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";

const description = "Plotting of relative permeability results.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "NewRelPerm",
    defaultTitle: "New Relative Permeability",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.RELPERM],
    description,
});
