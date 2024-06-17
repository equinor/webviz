import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import { Interface, State } from "./settingsToViewInterface";

export const MODULE_NAME = "FlowNetwork";

const description = "Visualizes dated group trees over time.";

ModuleRegistry.registerModule<State, Interface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Flow Network",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.GROUP_TREE, ModuleDataTagId.SUMMARY],
    preview,
    description,
});
