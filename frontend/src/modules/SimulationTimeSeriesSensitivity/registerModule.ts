import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { channelDefs } from "./channelDefs";
import { SettingsToViewInterface } from "./settingsToViewInterface";

const description = "Plotting of simulation time series data for ensembles with design matrices.";

ModuleRegistry.registerModule<SettingsToViewInterface>({
    moduleName: "SimulationTimeSeriesSensitivity",
    defaultTitle: "Simulation time series per sensitivity",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.SUMMARY],
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    channelDefinitions: channelDefs,
    description,
});
