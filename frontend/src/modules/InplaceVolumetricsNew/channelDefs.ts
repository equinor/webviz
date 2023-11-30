import { ChannelDefinitions, Genre, Type } from "@framework/DataChannelTypes";

export enum Channels {
    ResponseValuePerRealization = "Response value (per realization)",
}

export const channels: ChannelDefinitions = {
    [Channels.ResponseValuePerRealization]: {
        name: "Response value (per realization)",
        genre: Genre.Realization,
        dataType: Type.Number,
    },
};
