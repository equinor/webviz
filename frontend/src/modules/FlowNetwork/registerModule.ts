import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "FlowNetwork";

const description = "Visualizes dated flow networks over time.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Flow Network",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.GROUP_TREE, ModuleDataTagId.SUMMARY],
    preview,
    description,
});
