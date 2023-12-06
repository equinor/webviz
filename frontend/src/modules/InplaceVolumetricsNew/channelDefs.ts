import { KeyKind, KeyType, ModuleChannelDefinition } from "@framework/DataChannelTypes";

export enum Channels {
    ResponseValuePerRealization = "Response value (per realization)",
}

export const channels: ModuleChannelDefinition[] = [
    {
        idString: Channels.ResponseValuePerRealization,
        displayName: "Response value (per realization)",
        kindOfKey: KeyKind.Realization,
    },
];
