import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";
import { preview } from "./preview";

export const MODULE_NAME = "EconomicScreening";

const description = `Screening of net present value, discounted volumes, IRR and break-even oil price
                     from simulated production profiles. Publishes the per realization results as data
                     channels for tornado and correlation plots.`;

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Economic screening (NPV / discounted volumes)",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.SUMMARY, ModuleDataTagId.PARAMETERS],
    preview,
    channelDefinitions: channelDefs,
    description,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});
