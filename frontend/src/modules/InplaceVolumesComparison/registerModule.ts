import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";
import { preview } from "./preview";

export const MODULE_NAME = "InplaceVolumesChangeDecomposition";

const description =
    "Decomposes the change in STOIIP/GIIP between two ensembles into contributions from its volumetric factors.";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Volume Change Decomposition",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.INPLACE_VOLUMES],
    description,
    preview,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});
