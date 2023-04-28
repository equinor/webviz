import { SyncSettingKey } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

ModuleRegistry.registerModule<State>("SimulationTimeSeries", [
    SyncSettingKey.ENSEMBLE,
    SyncSettingKey.DATE,
    SyncSettingKey.TIMESERIES,
]);
