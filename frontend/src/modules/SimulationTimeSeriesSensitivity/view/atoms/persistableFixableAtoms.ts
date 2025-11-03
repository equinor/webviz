import { persistableFixableAtom } from "@framework/utils/atomUtils";

import { statisticalVectorSensitivityDataQueryAtom } from "./queryAtoms";

export const activeTimestampUtcMsAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const statisticalVectorSensitivityDataQuery = get(statisticalVectorSensitivityDataQueryAtom);

        if (
            !statisticalVectorSensitivityDataQuery.isFetching &&
            value === null &&
            Boolean(statisticalVectorSensitivityDataQuery.data?.length)
        ) {
            return false;
        }

        return true;
    },
    fixupFunction: ({ get, value }) => {
        const statisticalVectorSensitivityDataQuery = get(statisticalVectorSensitivityDataQueryAtom);

        if (
            !statisticalVectorSensitivityDataQuery.isFetching &&
            (value === null || value === undefined) &&
            Boolean(statisticalVectorSensitivityDataQuery.data?.length)
        ) {
            // Return last timestamp
            return statisticalVectorSensitivityDataQuery.data?.at(0)?.timestampsUtcMs.slice(-1)[0] ?? null;
        }

        return value ?? null;
    },
});
