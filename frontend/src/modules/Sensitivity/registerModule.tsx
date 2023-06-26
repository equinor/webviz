import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

ModuleRegistry.registerModule<State>("Sensitivity", "Sensitivity", [
    SyncSettingKey.ENSEMBLE,
    SyncSettingKey.TIME_SERIES,
]);
