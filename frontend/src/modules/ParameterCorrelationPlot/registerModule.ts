import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import type { Interfaces } from "./interfaces";
import { preview } from "./preview";
import { receiverDefs } from "./receiverDefs";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "ParameterCorrelationPlot",
    defaultTitle: "Parameter Correlation plot",
    category: ModuleCategory.SUB,
    devState: ModuleDevState.PROD,
    syncableSettingKeys: [SyncSettingKey.PARAMETER],
    dataTagIds: [ModuleDataTagId.PARAMETERS, ModuleDataTagId.SUMMARY, ModuleDataTagId.INPLACE_VOLUMETRICS],
    channelReceiverDefinitions: receiverDefs,
    // preview,
    description: "Pearson correlation between input parameters and the responses from a connected module.",
});
