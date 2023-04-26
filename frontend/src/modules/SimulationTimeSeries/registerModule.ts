import { SyncSettings } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

ModuleRegistry.registerModule<State>("SimulationTimeSeries", [
    SyncSettings.ENSEMBLE,
    SyncSettings.DATE,
    SyncSettings.TIMESERIES,
]);
