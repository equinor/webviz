import { persistableFixableAtom } from "@framework/utils/atomUtils";

import { loadedVectorSpecificationsAndRealizationDataAtom, queryIsFetchingAtom } from "./derivedAtoms";

export const activeTimestampUtcMsAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const loadedVectorSpecificationsAndRealizationData = get(loadedVectorSpecificationsAndRealizationDataAtom);
        const isQueryFetching = get(queryIsFetchingAtom);

        if (!isQueryFetching && value === null && loadedVectorSpecificationsAndRealizationData.length > 0) {
            return false;
        }

        return true;
    },
    fixupFunction: ({ get, value }) => {
        const loadedVectorSpecificationsAndRealizationData = get(loadedVectorSpecificationsAndRealizationDataAtom);
        const isQueryFetching = get(queryIsFetchingAtom);

        if (
            !isQueryFetching &&
            (value === null || value === undefined) &&
            loadedVectorSpecificationsAndRealizationData.length > 0
        ) {
            // Return last timestamp
            return loadedVectorSpecificationsAndRealizationData.at(0)?.data.at(0)?.timestampsUtcMs.at(-1) ?? null;
        }

        return value ?? null;
    },
});
