import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

ModuleRegistry.registerModule<State>(
    "DistributionPlot",
    "Distribution plot",
    [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    undefined,
    preview
);
