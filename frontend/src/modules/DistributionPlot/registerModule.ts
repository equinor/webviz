import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { receiverDefs } from "./receiverDefs";
import { SettingsToViewInterface } from "./settingsToViewInterface";

const description =
    "Sub-module that can be connected to other modules via data channels for visualization of distribution data.";

ModuleRegistry.registerModule<SettingsToViewInterface>({
    moduleName: "DistributionPlot",
    defaultTitle: "Distribution plot",
    category: ModuleCategory.SUB,
    devState: ModuleDevState.PROD,
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    channelReceiverDefinitions: receiverDefs,
    preview,
    description,
});
