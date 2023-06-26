import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

ModuleRegistry.registerModule<State>("TimeSeriesParameterDistribution", "Time series parameter distribution", [
    SyncSettingKey.ENSEMBLE,
    SyncSettingKey.TIME_SERIES,
]);
