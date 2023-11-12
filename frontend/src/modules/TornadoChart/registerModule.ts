import { Genre, InputBroadcastChannelDef } from "@framework/Broadcaster";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

const inputChannelDefs: InputBroadcastChannelDef[] = [
    {
        name: "response",
        displayName: "Response",
        keyCategories: [Genre.Realization],
    },
];

ModuleRegistry.registerModule<State>({
    moduleName: "TornadoChart",
    defaultTitle: "Tornado Chart",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    inputChannelDefs,
    preview,
});
