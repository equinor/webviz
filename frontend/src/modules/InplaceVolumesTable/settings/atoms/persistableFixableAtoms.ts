import type { Getter } from "jotai";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";
import {
    fixupUserSelectedIndexValues,
    getSelectionForOfferedIndexColumns,
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
    computeDependenciesState: ({ get }) => get(tableDefinitionsQueryAtom).dependenciesState,
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
    computeDependenciesState: computeSelectedTableDefinitionsDependenciesState,
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
    computeDependenciesState: computeSelectedTableDefinitionsDependenciesState,
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
    computeDependenciesState: computeSelectedTableDefinitionsDependenciesState,
    precomputeFunction: ({ get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        return tableDefinitionsAccessor.getCommonIndicesWithValues();
    },
    isValidFunction: ({ value, precomputedValue: availableIndicesWithValues }) => {
        // Only the offered columns are judged, and one without an entry counts as unfiltered - see
        // getSelectionForOfferedIndexColumns(). With none offered, there is nothing to select, so any selection is valid.
        if (availableIndicesWithValues.length === 0) {
            return true;
        }
        const offeredSelection = getSelectionForOfferedIndexColumns(value, availableIndicesWithValues);
        return isSelectedIndicesWithValuesValidSubset(offeredSelection, availableIndicesWithValues);
    },
    fixupFunction: ({ value, precomputedValue: availableIndicesWithValues }) => {
        return fixupUserSelectedIndexValues(value ?? [], availableIndicesWithValues, FixupSelection.SELECT_ALL);
    },
});

// The table definitions are filtered by the selected table names. While they are invalid, there are no options to check
// against - so the settings wait (and don't settle on the empty options) until valid table names are selected.
function computeSelectedTableDefinitionsDependenciesState({
    get,
}: {
    get: (atom: any) => any;
}): PersistableAtomDependenciesState {
    const tableDefinitionsQueryDependenciesState = get(tableDefinitionsQueryAtom).dependenciesState;
    if (tableDefinitionsQueryDependenciesState !== "loaded") {
        return tableDefinitionsQueryDependenciesState;
    }
    return get(selectedTableNamesAtom).isValidInContext ? "loaded" : "blocked";
}
