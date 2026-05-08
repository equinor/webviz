import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";
import { preview } from "./preview";

export const MODULE_NAME = "RelPerm";

const description = "Plotting and analysis of relative permeability and capillary pressure curves.";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Relative Permeability",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.RELPERM],
    channelDefinitions: channelDefs,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
    preview,
    description,
});
