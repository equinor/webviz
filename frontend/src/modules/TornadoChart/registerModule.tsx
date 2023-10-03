import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "TornadoChart",
    defaultTitle: "Tornado Chart",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    preview,
});
