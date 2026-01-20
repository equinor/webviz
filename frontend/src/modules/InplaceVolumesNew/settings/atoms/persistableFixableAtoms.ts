import type { InplaceVolumesIndexWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";
import {
    fixupUserSelectedIndexValues,
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
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => {
        //Cannot use tableDefinitionsAccessorAtom here due to circular dependency
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
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
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

export const selectedSelectorColumnAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
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
export const selectedSubplotByAtom = persistableFixableAtom<string, string[]>({
    initialValue: TableOriginKey.ENSEMBLE,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
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
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
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
