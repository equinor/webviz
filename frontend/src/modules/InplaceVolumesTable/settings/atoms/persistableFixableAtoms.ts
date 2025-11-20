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
    isValidFunction: ({ value, get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        const validResultNames = tableDefinitionsAccessor.getResultNamesIntersection();
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
        return fixedSelection.length > 0 ? fixedSelection : [fixedSelection[0]];
    },
});

export const selectedGroupByIndicesAtom = persistableFixableAtom<string[], string[]>({
    initialValue: [],
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
    precomputeFunction: ({ get }) => {
        const tableDefinitionsAccessor = get(tableDefinitionsAccessorAtom);
        return tableDefinitionsAccessor.getCommonIndicesWithValues();
    },
    isValidFunction: ({ value, precomputedValue }) => {
        return value.length > 0 && value.every((index) => precomputedValue.includes(index));
    },
    fixupFunction: ({ value, precomputedValue }) => {
        return fixupUserSelectedIndexValues(value ?? [], precomputedValue, FixupSelection.SELECT_ALL);
    },
});
