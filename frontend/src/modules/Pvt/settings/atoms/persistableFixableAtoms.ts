import { isEqual } from "lodash-es";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { areEnsembleIdentListsEqual } from "@framework/utils/ensembleIdentUtils";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";

import { availableRealizationNumbersAtom, pvtDataAccessorWithStatusAtom } from "./derivedAtoms";

export const selectedEnsembleIdentsAtom = persistableFixableAtom<RegularEnsembleIdent[]>({
    initialValue: [],
    areEqualFunction: areEnsembleIdentListsEqual,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        if (value.length === 0 && ensembleSet.getEnsembleArray().length > 0) {
            return false;
        }

        return value.every((ident) => ensembleSet.hasEnsemble(ident));
    },
    fixupFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        return fixupRegularEnsembleIdents(value ?? null, ensembleSet) ?? [];
    },
});

export const selectedRealizationNumbersAtom = persistableFixableAtom<number[]>({
    initialValue: [],
    areEqualFunction: isEqual,
    isValidFunction: ({ get, value }) => {
        const availableRealizations = get(availableRealizationNumbersAtom);

        const isInvalidEmptySelection = value.length === 0 && availableRealizations.length > 0;

        return !isInvalidEmptySelection && value.every((realization) => availableRealizations.includes(realization));
    },
    fixupFunction: ({ get, value }) => {
        const availableRealizations = get(availableRealizationNumbersAtom);

        const validRealizations = (value ?? []).filter((realization) => availableRealizations.includes(realization));
        if (validRealizations.length === 0 && availableRealizations.length > 0) {
            return [availableRealizations[0]];
        }
        return validRealizations;
    },
});

export const selectedPvtNumsAtom = persistableFixableAtom<number[], number[]>({
    initialValue: [],
    areEqualFunction: isEqual,
    precomputeFunction: ({ get }) => {
        const pvtDataAccessor = get(pvtDataAccessorWithStatusAtom).pvtDataAccessor;
        return pvtDataAccessor?.getUniquePvtNums() || [];
    },
    computeDependenciesState: ({ get }) => {
        const pvtDataAccessorWithStatus = get(pvtDataAccessorWithStatusAtom);

        // Nothing is requested while the ensemble or realization selection is invalid or empty - the PVT nums wait
        if (pvtDataAccessorWithStatus.pvtDataAccessor === null) {
            return "blocked";
        }

        if (pvtDataAccessorWithStatus.isFetching) {
            return "loading";
        }

        // The accessor then only has empty tables, which are no data to settle the PVT nums against. Partial failures
        // still provide the PVT nums of the other realizations.
        if (pvtDataAccessorWithStatus.allQueriesFailed) {
            return "error";
        }

        return "loaded";
    },
    isValidFunction: ({ value, precomputedValue: uniquePvtNums }) => {
        if (!value || value.length === 0) {
            return uniquePvtNums.length === 0;
        }

        return value.every((pvtNum) => uniquePvtNums.includes(pvtNum));
    },
    fixupFunction: ({ value, precomputedValue: uniquePvtNums }) => {
        if (!value || value.length === 0) {
            return uniquePvtNums.length > 0 ? [uniquePvtNums[0]] : [];
        }
        return value.filter((pvtNum) => uniquePvtNums.includes(pvtNum));
    },
});
