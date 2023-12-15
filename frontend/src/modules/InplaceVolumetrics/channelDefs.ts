import { KeyKind, ModuleChannelDefinition } from "@framework/DataChannelTypes";

export enum BroadcastChannelNames {
    Response = "Response (per realization)",
}

export const channelDefs: ModuleChannelDefinition[] = [
    {
        idString: BroadcastChannelNames.Response,
        displayName: "Response (per realization)",
        kindOfKey: KeyKind.Realization,
    },
];
