import type { Getter } from "jotai";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";
import {
    fixupUserSelectedIndexValues,
    isSelectedIndicesWithValuesValidSubset,
} from "@modules/_shared/InplaceVolumes/indexWithValuesUtils";
import { makeUniqueTableNamesIntersection } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { isFluidSpecificResultName, TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

import { tableDefinitionsAccessorAtom } from "./derivedAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentsAtom = persistableFixableAtom<(RegularEnsembleIdent | DeltaEnsembleIdent)[]>({
    initialValue: [],
    isValidFunction: ({ get, value }) => {
        if (value.length === 0) {
            return false;
        }
        const ensembleSet = get(EnsembleSetAtom);

        return value.every((ident) => ensembleSet.hasEnsemble(ident));
    },
    fixupFunction: ({ value, get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return fixupEnsembleIdents(value ?? null, ensembleSet) ?? [];
    },
});

export const selectedTableNamesAtom = persistableFixableAtom<string[], string[]>({
    initialValue: [],
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => {
        const tableDefinitionsQueryResult = get(tableDefinitionsQueryAtom);
        const uniqueTableNames = makeUniqueTableNamesIntersection(tableDefinitionsQueryResult.data);

        return uniqueTableNames;
    },
    isValidFunction: ({ value, precomputedValue: uniqueTableNames }) => {
        return value.length > 0 && value.every((name) => uniqueTableNames.includes(name));
    },
    fixupFunction: ({ precomputedValue: uniqueTableNames }) => {
        return uniqueTableNames;
    },
});

export const selectedGroupByIndicesAtom = persistableFixableAtom<string[], string[]>({
    initialValue: [],
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        return tableDefinitionsAccessor.getCommonIndicesWithValues().map((el) => el.indexColumn);
    },
    isValidFunction: ({ value, precomputedValue }) => {
        return value.every((index) => precomputedValue.includes(index));
    },
    fixupFunction: ({ value, precomputedValue }) => {
        return fixupUserSelection(value ?? [], precomputedValue);
    },
});

/**
 * Result names that can be requested given the current grouping.
 *
 * The backend only computes BO/BG per fluid and discards them when the fluids are summed, so they
 * are unavailable unless FLUID is part of the grouping.
 */
export function getSelectableResultNames(get: Getter): string[] {
    const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
    const isGroupedByFluid = get(selectedGroupByIndicesAtom).value.includes(TableOriginKey.FLUID);

    return tableDefinitionsAccessor
        .getResultNamesIntersection()
        .filter((name) => isGroupedByFluid || !isFluidSpecificResultName(name));
}

export const selectedResultNamesAtom = persistableFixableAtom<string[]>({
    initialValue: [],
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    isValidFunction: ({ value, get }) => {
        const tableDefinitions = get(tableDefinitionsQueryAtom);
        const validResultNames = getSelectableResultNames(get);

        // Do not perform fixup during loading of new table definitions
        if (tableDefinitions.isLoading) {
            return true;
        }

        if (value.length === 0) {
            if (validResultNames.length > 0) {
                return false;
            }
            return true;
        }
        return value?.every((name) => validResultNames.includes(name)) ?? false;
    },
    fixupFunction: ({ value, get }) => {
        const fixedSelection = fixupUserSelection(value ?? [], getSelectableResultNames(get));
        return fixedSelection.length > 0 ? fixedSelection : [];
    },
});

export const selectedIndicesWithValuesAtom = persistableFixableAtom<
    InplaceVolumesIndexWithValues_api[],
    InplaceVolumesIndexWithValues_api[]
>({
    initialValue: [],
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        return tableDefinitionsAccessor.getCommonIndicesWithValues();
    },
    isValidFunction: ({ value, precomputedValue: availableIndicesWithValues }) => {
        return value.length > 0 && isSelectedIndicesWithValuesValidSubset(value, availableIndicesWithValues);
    },
    fixupFunction: ({ value, precomputedValue: availableIndicesWithValues }) => {
        return fixupUserSelectedIndexValues(value ?? [], availableIndicesWithValues, FixupSelection.SELECT_ALL);
    },
});

// Utility function to compute dependencies state from tableDefinitionsQueryAtom
function computeTableDefinitionsQueryDependenciesState({
    get,
}: {
    get: (atom: any) => any;
}): "error" | "loading" | "loaded" {
    const tableDefinitions = get(tableDefinitionsQueryAtom);
    if (tableDefinitions.isLoading) {
        return "loading";
    }
    if (tableDefinitions.errors.length > 0) {
        return "error";
    }
    return "loaded";
}
