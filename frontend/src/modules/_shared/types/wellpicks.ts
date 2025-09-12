import type { WellborePick_api } from "@api";

export type WellPickDataCollection = {
    picks: WellborePick_api[];
    // We currently don't use these fields anywhere, but I'm leaving them here so they're available in the future
    stratColumn: string;
    interpreter: string;
};
