import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

ModuleRegistry.registerModule<State>(
    "Sensitivity",
    "Sensitivity",
    [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    undefined,
    preview
);
