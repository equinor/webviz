import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";
import { preview } from "./preview";
import { receiverDefs } from "./receiverDefs";
export const MODULE_NAME = "DistributionPlot";
const description =
    "Sub-module that can be connected to other modules via data channels for visualization of distribution data.";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Distribution plot",
    category: ModuleCategory.SUB,
    devState: ModuleDevState.PROD,
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    channelReceiverDefinitions: receiverDefs,
    preview,
    description,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});
