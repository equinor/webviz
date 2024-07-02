import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import { Interface, State } from "./state";

export const MODULE_NAME = "Vfp";

const description =
    "Visualizes Vfp tables from Eclipse.";

ModuleRegistry.registerModule<State, Interface>({
    moduleName: MODULE_NAME,
    defaultTitle: "VFP",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.VFP],
    preview,
    description,
});
