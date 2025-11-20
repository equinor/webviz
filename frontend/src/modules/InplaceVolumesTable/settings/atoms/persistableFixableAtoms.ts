import type { InplaceVolumesIndexWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";
import { fixupUserSelectedIndexValues } from "@modules/_shared/InplaceVolumes/fixupUserSelectedIndexValues";
import { makeUniqueTableNamesIntersection } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

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
        const tableDefinitionsQueryResult = get(tableDefinitionsQueryAtom);
        const uniqueTableNames = makeUniqueTableNamesIntersection(tableDefinitionsQueryResult.data);

        return uniqueTableNames;
    },
    isValidFunction: ({ value, precomputedValue: uniqueTableNames }) => {
        return value.length > 0 && value.every((name) => uniqueTableNames.includes(name));
    },
    fixupFunction: ({ precomputedValue: uniqueTableNames }) => {
        return uniqueTableNames.length > 0 ? [uniqueTableNames[0]] : [];
    },
});

export const selectedResultNamesAtom = persistableFixableAtom<string[]>({
    initialValue: [],
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    isValidFunction: ({ value, get }) => {
        const tableDefinitions = get(tableDefinitionsQueryAtom);
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        const validResultNames = tableDefinitionsAccessor.getResultNamesIntersection();

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
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

        const fixedSelection = fixupUserSelection(value ?? [], tableDefinitionsAccessor.getResultNamesIntersection());
        return fixedSelection.length > 0 ? fixedSelection : [];
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
    isValidFunction: ({ value, precomputedValue }) => {
        return value.length > 0 && isSelectionValidSubset(value, precomputedValue);
    },
    fixupFunction: ({ value, precomputedValue }) => {
        return fixupUserSelectedIndexValues(value ?? [], precomputedValue, FixupSelection.SELECT_ALL);
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

// Utility function to check if a selection is a valid subset of available options
function isSelectionValidSubset(
    selection: InplaceVolumesIndexWithValues_api[],
    available: InplaceVolumesIndexWithValues_api[],
): boolean {
    // Selection cannot contain more indexColumns than available options
    if (selection.length > available.length) return false;

    for (const sel of selection) {
        // Find corresponding available item
        const avail = available.find((a) => a.indexColumn === sel.indexColumn);
        if (!avail) return false; // invalid indexColumn

        // All selected values must be allowed
        for (const v of sel.values) {
            if (!avail.values.includes(v)) return false;
        }
    }

    return true;
}
