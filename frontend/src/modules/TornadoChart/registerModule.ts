import { KeyKind, SubscriberDefinition } from "@framework/DataChannelTypes";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

const subscriberDefs: SubscriberDefinition[] = [
    {
        ident: "response",
        name: "Response",
        supportedGenres: [KeyKind.Realization],
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
