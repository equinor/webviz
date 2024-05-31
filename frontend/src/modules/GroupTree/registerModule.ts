import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import { Interface, State } from "./settingsToViewInterface";

export const MODULE_NAME = "GroupTree";

const description = "Visualizes group tree data over time.";

ModuleRegistry.registerModule<State, Interface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Group Tree",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.GROUP_TREE, ModuleDataTagId.SUMMARY],
    preview,
    description,
});
