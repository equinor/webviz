import { atom } from "jotai";

import { userSelectedActiveTimestampUtcMsAtom } from "./baseAtoms";
import {
    historicalVectorDataQueryAtom,
    statisticalVectorSensitivityDataQueryAtom,
    vectorDataQueryAtom,
} from "./queryAtoms";

export const activeTimestampUtcMsAtom = atom<number | null>((get) => {
    const userSelectedActiveTimestampUtcMs = get(userSelectedActiveTimestampUtcMsAtom);
    const statisticalVectorSensitivityDataQuery = get(statisticalVectorSensitivityDataQueryAtom);

    const lastTimestampUtcMs = statisticalVectorSensitivityDataQuery.data?.at(0)?.timestampsUtcMs.slice(-1)[0] ?? null;

    if (lastTimestampUtcMs !== null && userSelectedActiveTimestampUtcMs === null) {
        return lastTimestampUtcMs;
    }
    return userSelectedActiveTimestampUtcMs;
});

export const queryIsFetchingAtom = atom((get) => {
    const vectorDataQuery = get(vectorDataQueryAtom);
    const statisticalVectorSensitivityDataQuery = get(statisticalVectorSensitivityDataQueryAtom);
    const historicalVectorDataQuery = get(historicalVectorDataQueryAtom);

    return (
        vectorDataQuery.isFetching ||
        statisticalVectorSensitivityDataQuery.isFetching ||
        historicalVectorDataQuery.isFetching
    );
});
