import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";
import { preview } from "./preview";

export const MODULE_NAME = "InplaceVolumesComparison";

const description =
    "Compare two inplace volumes sources: two ensembles, or two volume tables. Shows a waterfall " +
    "decomposing the STOIIP/GIIP change into contributions from its volumetric factors. Compares mean " +
    "volumes, so the two sources do not need matching realizations.";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Inplace Volumes Comparison",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.INPLACE_VOLUMES],
    description,
    preview,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});
