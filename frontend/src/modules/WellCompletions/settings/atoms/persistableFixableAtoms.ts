import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";

import { syncedEnsembleIdentsAtom } from "./baseAtoms";
import { availableRealizationsAtom, sortedCompletionDatesAtom } from "./derivedAtoms";

export const selectedEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const syncedEnsembleIdents = get(syncedEnsembleIdentsAtom);
        const ensembleSet = get(EnsembleSetAtom);

        if (syncedEnsembleIdents && syncedEnsembleIdents.length > 0) {
            return value === syncedEnsembleIdents[0];
        }

        return value !== null && ensembleSet.hasEnsemble(value);
    },
    fixupFunction: ({ get }) => {
        const syncedEnsembleIdents = get(syncedEnsembleIdentsAtom);
        const ensembleSet = get(EnsembleSetAtom);

        if (syncedEnsembleIdents && syncedEnsembleIdents.length > 0) {
            return syncedEnsembleIdents[0];
        }
        return ensembleSet.getRegularEnsembleArray()[0]?.getIdent() || null;
    },
});

export const selectedRealizationAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const availableRealizations = get(availableRealizationsAtom);

        if (value === null) {
            return availableRealizations.length === 0;
        }
        return availableRealizations.includes(value);
    },
    fixupFunction: ({ get }) => {
        const availableRealizations = get(availableRealizationsAtom);
        return availableRealizations[0] ?? null;
    },
});

export const selectedCompletionDateIndexAtom = persistableFixableAtom<number | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const sortedCompletionDates = get(sortedCompletionDatesAtom);

        if (!sortedCompletionDates) {
            return value === null;
        }

        return value !== null && value >= 0 && value < sortedCompletionDates.length;
    },
    fixupFunction: ({ get }) => {
        const sortedCompletionDates = get(sortedCompletionDatesAtom);

        if (!sortedCompletionDates || sortedCompletionDates.length === 0) {
            return null;
        }

        if (sortedCompletionDates.length === 0) {
            return 0;
        }
        return sortedCompletionDates.length - 1;
    },
});

export const selectedCompletionDateIndexRangeAtom = persistableFixableAtom<[number, number] | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const sortedCompletionDates = get(sortedCompletionDatesAtom);

        if (!sortedCompletionDates) {
            return value === null;
        }
        if (!value) {
            return sortedCompletionDates.length === 0;
        }

        const [startIndex, endIndex] = value;
        if (startIndex > endIndex) {
            return false;
        }
        if (startIndex >= sortedCompletionDates.length || startIndex < 0) {
            return false;
        }
        if (endIndex >= sortedCompletionDates.length || endIndex < 0) {
            return false;
        }
        return true;
    },
    fixupFunction: ({ get, value }) => {
        const sortedCompletionDates = get(sortedCompletionDatesAtom);

        if (!sortedCompletionDates || sortedCompletionDates.length === 0) {
            return null;
        }

        if (!value) {
            return [0, sortedCompletionDates.length - 1];
        }

        // Ensure valid range: start <= end, and within bounds
        const startIndex = Math.min(value[0], value[1]);
        const endIndex = Math.max(value[0], value[1]);
        const limitedStartIndex = Math.min(Math.max(0, startIndex), sortedCompletionDates.length - 1);
        const limitedEndIndex = Math.min(Math.max(0, endIndex), sortedCompletionDates.length - 1);
        return [limitedStartIndex, limitedEndIndex];
    },
});
