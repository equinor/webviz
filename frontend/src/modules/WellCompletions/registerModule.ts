import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import { State } from "./state";

const description = "Vizualizes Eclipse well completions data per well. The data is grouped by well and zone.";

ModuleRegistry.registerModule<State>({
    moduleName: "WellCompletions",
    defaultTitle: "Well Completions",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.WELL_COMPLETIONS],
    preview,
    description,
});
