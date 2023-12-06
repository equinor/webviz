import { KeyKind, ModuleChannelReceiverDefinition } from "@framework/DataChannelTypes";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

const subscriberDefs: ModuleChannelReceiverDefinition[] = [
    {
        idString: "response",
        displayName: "Response",
        supportedKindsOfKeys: [KeyKind.Realization],
        supportsMultiContents: false,
    },
];

ModuleRegistry.registerModule<State>({
    moduleName: "TornadoChart",
    defaultTitle: "Tornado Chart",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    preview,
    subscribers: subscriberDefs,
});
