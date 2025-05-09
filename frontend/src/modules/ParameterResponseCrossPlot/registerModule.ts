import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import type { Interfaces } from "./interfaces";
import { receiverDefs } from "./receiverDefs";
import { preview } from "./preview";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "ParameterResponseCrossPlot",
    defaultTitle: "Parameter/response cross plot",
    category: ModuleCategory.SUB,
    devState: ModuleDevState.PROD,
    syncableSettingKeys: [SyncSettingKey.PARAMETER],
    dataTagIds: [ModuleDataTagId.PARAMETERS, ModuleDataTagId.SUMMARY, ModuleDataTagId.INPLACE_VOLUMETRICS],
    channelReceiverDefinitions: receiverDefs,
    description: "Cross plot input parameters and the responses from a connected module.",
    preview,
});
