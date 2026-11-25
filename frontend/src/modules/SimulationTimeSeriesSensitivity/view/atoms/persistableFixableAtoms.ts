import { persistableFixableAtom } from "@framework/utils/atomUtils";

import { statisticalVectorSensitivityDataQueryAtom } from "./queryAtoms";

export const activeTimestampUtcMsAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    // Without data, there is no timestamp to pick yet - settling then would keep null once the data arrives
    computeDependenciesState: ({ get }) => {
        const statisticalVectorSensitivityDataQuery = get(statisticalVectorSensitivityDataQueryAtom);
        if (statisticalVectorSensitivityDataQuery.isFetching) {
            return "loading";
        }
        return statisticalVectorSensitivityDataQuery.data?.value?.length ? "loaded" : "blocked";
    },
    isValidFunction: ({ get, value }) => {
        const statisticalVectorSensitivityDataQuery = get(statisticalVectorSensitivityDataQueryAtom);

        if (
            !statisticalVectorSensitivityDataQuery.isFetching &&
            value === null &&
            Boolean(statisticalVectorSensitivityDataQuery.data?.value?.length)
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
            Boolean(statisticalVectorSensitivityDataQuery.data?.value?.length)
        ) {
            // Return last timestamp
            return statisticalVectorSensitivityDataQuery.data?.value?.at(0)?.timestampsUtcMs.slice(-1)[0] ?? null;
        }

        return value ?? null;
    },
});
