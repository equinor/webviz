import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";
import { preview } from "./preview";

const description = "Vizualizes Eclipse well completions data per well. The data is grouped by well and zone.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "WellCompletions",
    defaultTitle: "Well Completions",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.WELL_COMPLETIONS],
    preview,
    description,
});
