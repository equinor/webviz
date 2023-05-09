import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { State } from "./state";

ModuleRegistry.registerModule<State>("ScatterPlot", [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES]);
