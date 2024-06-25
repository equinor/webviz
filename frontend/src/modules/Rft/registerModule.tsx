import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import State from "./state";

const description = "Plotting of simulated RFT results.";

ModuleRegistry.registerModule<State>({
    moduleName: "Rft",
    defaultTitle: "RFT",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.RFT],
    description,
});
