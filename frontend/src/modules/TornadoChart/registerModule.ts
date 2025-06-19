import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import type { Interfaces } from "./interfaces";
import { preview } from "./preview";
import { receiverDefs } from "./receiverDefs";

export const MODULE_NAME = "TornadoChart";

const description = `Ranks sensitivities from a design matrix run with the responses from a connected module.
                     Can be presented as a tornado plot or a table.`;

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Tornado plot",
    category: ModuleCategory.SUB,
    devState: ModuleDevState.PROD,
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    dataTagIds: [ModuleDataTagId.PARAMETERS, ModuleDataTagId.SUMMARY, ModuleDataTagId.INPLACE_VOLUMES],
    preview,
    channelReceiverDefinitions: receiverDefs,
    description,
});
