import { atom } from "jotai";

/**
 * Stores the currently active (clicked) timestamp in UTC milliseconds.
 * Set when the user clicks a data point in the timeseries chart.
 * Used by the data channel publisher to pick realization values at that timestep.
 */
export const activeTimestampUtcMsAtom = atom<number | null>(null);
