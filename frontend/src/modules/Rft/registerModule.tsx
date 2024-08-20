import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";

const description = "Plotting of simulated RFT results.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "Rft",
    defaultTitle: "RFT",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.RFT],
    description,
});
