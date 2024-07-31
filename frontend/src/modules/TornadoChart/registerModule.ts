import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { Interfaces } from "./interfaces";
import { preview } from "./preview";
import { receiverDefs } from "./receiverDefs";

export const MODULE_NAME = "TornadoChart";

const description =
    "Sub-module that can be connected to other modules via data channels for visualization of one-by-one sensitivities.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "Tornado Chart",
    category: ModuleCategory.SUB,
    devState: ModuleDevState.PROD,
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    preview,
    channelReceiverDefinitions: receiverDefs,
    description,
});
