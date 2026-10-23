import type { InplaceVolumesIndexWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";
import {
    fixupUserSelectedIndexValues,
    getSelectionForOfferedIndexColumns,
    isSelectedIndicesWithValuesValidSubset,
} from "@modules/_shared/InplaceVolumes/indexWithValuesUtils";
import { makeUniqueTableNamesIntersection } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

import { makeColorByOptions, makeSubplotByOptions } from "../utils/plotDimensionUtils";

import { tableDefinitionsAccessorAtom } from "./derivedAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentsAtom = persistableFixableAtom<RegularEnsembleIdent[]>({
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
        return fixupRegularEnsembleIdents(value ?? null, ensembleSet) ?? [];
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

export const selectedFirstResultNameAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    computeDependenciesState: computeSelectedTableDefinitionsDependenciesState,
    isValidFunction: ({ get, value }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        return value !== null && tableDefinitionsAccessor.hasResultName(value);
    },
    fixupFunction: ({ value, get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        const validOptions = tableDefinitionsAccessor.getResultNamesIntersection();
        const fixedSelection = fixupUserSelection([value], validOptions) ?? [];
        return fixedSelection[0] ?? null;
    },
});
export const selectedSecondResultNameAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeSelectedTableDefinitionsDependenciesState,
    precomputeFunction: ({ get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        return tableDefinitionsAccessor.getResultNamesIntersection();
    },
    isValidFunction: ({ value, precomputedValue }) => {
        return value !== null && precomputedValue.includes(value);
    },
    fixupFunction: ({ value, precomputedValue }) => {
        const fixedSelection = fixupUserSelection([value], precomputedValue) ?? [];
        return fixedSelection[0] ?? null;
    },
});
export const selectedSelectorColumnAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeSelectedTableDefinitionsDependenciesState,
    precomputeFunction: ({ get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        return tableDefinitionsAccessor.getCommonSelectorColumns();
    },
    isValidFunction: ({ value, precomputedValue }) => {
        return value !== null && precomputedValue.includes(value);
    },
    fixupFunction: ({ value, precomputedValue }) => {
        const fixedSelection = fixupUserSelection([value], precomputedValue) ?? [];
        return fixedSelection[0] ?? null;
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
export const selectedSubplotByAtom = persistableFixableAtom<string, string[]>({
    initialValue: TableOriginKey.ENSEMBLE,
    computeDependenciesState: computeSelectedTableDefinitionsDependenciesState,
    precomputeFunction: ({ get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        const selectedTableNames = get(selectedTableNamesAtom);
        return makeSubplotByOptions(tableDefinitionsAccessor, selectedTableNames.value).map((el) => el.value);
    },
    isValidFunction: ({ value, precomputedValue }) => {
        return precomputedValue.includes(value);
    },
    fixupFunction: ({ value, precomputedValue }) => {
        const fixedSelection = fixupUserSelection([value], precomputedValue);
        return fixedSelection[0] || TableOriginKey.ENSEMBLE;
    },
});
export const selectedColorByAtom = persistableFixableAtom<string, string[]>({
    initialValue: TableOriginKey.TABLE_NAME,
    computeDependenciesState: computeSelectedTableDefinitionsDependenciesState,
    precomputeFunction: ({ get }) => {
        const selectedSubplotBy = get(selectedSubplotByAtom);
        const selectedTableNames = get(selectedTableNamesAtom);
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

        return makeColorByOptions(tableDefinitionsAccessor, selectedSubplotBy.value, selectedTableNames.value).map(
            (el) => el.value,
        );
    },
    isValidFunction: ({ value, precomputedValue }) => {
        return precomputedValue.includes(value);
    },
    fixupFunction: ({ value, precomputedValue }) => {
        const fixedSelection = fixupUserSelection([value], precomputedValue);
        return fixedSelection[0] || TableOriginKey.TABLE_NAME;
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
