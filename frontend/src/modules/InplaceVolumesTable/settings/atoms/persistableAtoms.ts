import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { tableDefinitionsQueryAtom } from "./queryAtoms";
import { makeUniqueTableNamesIntersection } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { tableDefinitionsAccessorAtom } from "./derivedAtoms";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import type { InplaceVolumesIndexWithValues_api } from "@api";
import { fixupUserSelectedIndexValues } from "@modules/_shared/InplaceVolumes/fixupUserSelectedIndexValues";

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

export const selectedResultNamesAtom = persistableFixableAtom<string[]>({
    initialValue: [],
    isValidFunction: ({ value, get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        const validResultNames = tableDefinitionsAccessor.getResultNamesIntersection();

        return value.every((name) => validResultNames.includes(name));
    },
    fixupFunction: ({ value, get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);

        return fixupUserSelection(value, tableDefinitionsAccessor.getResultNamesIntersection());
    },
});

export const selectedGroupByIndicesAtom = persistableFixableAtom<string[], string[]>({
    initialValue: [],
    precomputeFunction: ({ get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        return tableDefinitionsAccessor.getCommonIndicesWithValues().map((el) => el.indexColumn);
    },
    isValidFunction: ({ value, precomputedValue }) => {
        return value !== null && value.every((index) => precomputedValue.includes(index));
    },
    fixupFunction: ({ value, precomputedValue }) => {
        return fixupUserSelection(value ?? [], precomputedValue);
    },
});

export const selectedIndicesWithValuesAtom = persistableFixableAtom<InplaceVolumesIndexWithValues_api[]>({
    initialValue: [],
    isValidFunction: ({ value, get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        const uniqueIndicesWithValues = tableDefinitionsAccessor.getCommonIndicesWithValues();
        return value !== null && value.every((index) => uniqueIndicesWithValues.includes(index));
    },
    fixupFunction: ({ value, get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        const uniqueIndicesWithValues = tableDefinitionsAccessor.getCommonIndicesWithValues();

        return fixupUserSelectedIndexValues(value ?? [], uniqueIndicesWithValues, FixupSelection.SELECT_ALL);
    },
});
