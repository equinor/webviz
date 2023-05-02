import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

ModuleRegistry.registerModule<State>("SimulationTimeSeries", [
    SyncSettingKey.ENSEMBLE,
    SyncSettingKey.DATE,
    SyncSettingKey.TIME_SERIES,
]);
