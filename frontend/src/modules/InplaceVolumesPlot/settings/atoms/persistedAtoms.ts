import type { InplaceVolumesIndexWithValues_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";
import { fixupUserSelectedIndexValues } from "@modules/_shared/InplaceVolumes/fixupUserSelectedIndexValues";
import { makeUniqueTableNamesIntersection } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

import { makeColorByOptions, makeSubplotByOptions } from "../utils/plotDimensionUtils";

import { tableDefinitionsAccessorAtom } from "./derivedAtoms";
import { tableDefinitionsQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentsAtom = persistableFixableAtom<RegularEnsembleIdent[]>({
    initialValue: [],
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        return value.every((ident) => ensembleSet.hasEnsemble(ident));
    },
    fixupFunction: ({ value, get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return fixupRegularEnsembleIdents(value, ensembleSet) ?? [];
    },
});

export const selectedTableNamesAtom = persistableFixableAtom<string[], string[]>({
    initialValue: [],
    precomputeFunction: ({ get }) => {
        const tableDefinitionsQueryResult = get(tableDefinitionsQueryAtom);
        const uniqueTableNames = makeUniqueTableNamesIntersection(tableDefinitionsQueryResult.data);

        return uniqueTableNames;
    },
    isValidFunction: ({ value, precomputedValue: precomputed }) => {
        const uniqueTableNames = precomputed;

        return value !== null && value.every((name) => uniqueTableNames.includes(name));
    },
    fixupFunction: ({ precomputedValue: precomputed }) => {
        const uniqueTableNames = precomputed;
        return uniqueTableNames;
    },
});

export const selectedFirstResultNameAtom = persistableFixableAtom<string | null>({
    initialValue: null,
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
    precomputeFunction: ({ get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        return tableDefinitionsAccessor.getCommonIndicesWithValues();
    },
    isValidFunction: ({ value, precomputedValue }) => {
        return value !== null && value.every((index) => precomputedValue.includes(index));
    },
    fixupFunction: ({ value, precomputedValue }) => {
        return fixupUserSelectedIndexValues(value ?? [], precomputedValue, FixupSelection.SELECT_ALL);
    },
});
export const selectedSubplotByAtom = persistableFixableAtom<string, string[]>({
    initialValue: TableOriginKey.ENSEMBLE,
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
