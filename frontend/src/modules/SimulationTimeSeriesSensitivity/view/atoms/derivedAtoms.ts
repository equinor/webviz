import { atom } from "jotai";

import { userSelectedActiveTimestampUtcMsAtom } from "./baseAtoms";
import { statisticalVectorSensitivityDataQueryAtom } from "./queryAtoms";

export const activeTimestampUtcMsAtom = atom<number | null>((get) => {
    const userSelectedActiveTimestampUtcMs = get(userSelectedActiveTimestampUtcMsAtom);
    const statisticalVectorSensitivityDataQuery = get(statisticalVectorSensitivityDataQueryAtom);

    const lastTimestampUtcMs =
        statisticalVectorSensitivityDataQuery.data?.at(0)?.timestamps_utc_ms.slice(-1)[0] ?? null;

    if (lastTimestampUtcMs !== null && userSelectedActiveTimestampUtcMs === null) {
        return lastTimestampUtcMs;
    }
    return userSelectedActiveTimestampUtcMs;
});
