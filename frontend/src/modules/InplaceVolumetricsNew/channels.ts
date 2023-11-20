import { Channel, ContentType, Genre } from "@framework/NewBroadcaster";

export enum Channels {
    ResponseValuePerRealization = "Response value (per realization)",
}

export const channels: Channel[] = [
    {
        ident: Channels.ResponseValuePerRealization,
        name: "Response value (per realization)",
        genre: Genre.Realization,
        contentType: ContentType.Numeric,
    },
];
