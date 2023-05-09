import { BroadcastChannelDataTypes, MapDataTypeToTSType } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Response = "Response",
}

export const broadcastChannelNames = Object.values(BroadcastChannelNames);

export const broadcastChannelDefs = {
    [BroadcastChannelNames.Response]: {
        realization: BroadcastChannelDataTypes.realization,
        value: BroadcastChannelDataTypes.value,
    },
};

export type BroadcastChannelTypes = {
    [BroadcastChannelNames.Response]: MapDataTypeToTSType<
        (typeof broadcastChannelDefs)[BroadcastChannelNames.Response]
    >[];
};
