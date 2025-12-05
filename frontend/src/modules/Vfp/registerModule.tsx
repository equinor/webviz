import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";
import { preview } from "./preview";

export const MODULE_NAME = "Vfp";

const description = "Visualizes Vfp tables from Eclipse.";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "VFP",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.VFP],
    preview,
    description,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});
