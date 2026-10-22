import type { Getter } from "jotai";
import { isEqual } from "lodash-es";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { computeQueriesDependenciesState, persistableFixableAtom } from "@framework/utils/atomUtils";
import { areEnsembleIdentListsEqual } from "@framework/utils/ensembleIdentUtils";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { FixupSelection, fixupUserSelection } from "@lib/utils/fixupUserSelection";

import {
    availableCurveNamesAtom,
    availableSaturationAxisNamesAtom,
    availableSatnumsAtom,
    availableTableNamesAtom,
} from "./derivedAtoms";
import { relPermTableDefinitionQueriesAtom, relPermTableNamesQueriesAtom } from "./queryAtoms";

export const selectedEnsembleIdentsAtom = persistableFixableAtom<RegularEnsembleIdent[]>({
    initialValue: [],
    areEqualFunction: areEnsembleIdentListsEqual,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        const isInvalidEmptySelection = value.length === 0 && ensembleSet.hasAnyRegularEnsembles();

        return !isInvalidEmptySelection && value.every((ident) => ensembleSet.hasEnsemble(ident));
    },
    fixupFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return fixupRegularEnsembleIdents(value ?? null, ensembleSet) ?? [];
    },
});

export const selectedTableNameAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeTableNamesQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableTableNamesAtom),
    isValidFunction: ({ value, precomputedValue: availableTableNames }) => {
        return value !== null && availableTableNames.includes(value);
    },
    fixupFunction: ({ value, precomputedValue: availableTableNames }) => {
        const fixedSelection = fixupUserSelection([value], availableTableNames);
        return fixedSelection?.[0] ?? null;
    },
});

export const selectedSaturationAxisNameAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableSaturationAxisNamesAtom),
    isValidFunction: ({ value, precomputedValue: availableSaturationAxisNames }) => {
        return value !== null && availableSaturationAxisNames.includes(value);
    },
    fixupFunction: ({ value, precomputedValue: availableSaturationAxisNames }) => {
        const fixedSelection = fixupUserSelection([value], availableSaturationAxisNames);
        return fixedSelection?.[0] ?? null;
    },
});

export const selectedCurveNamesAtom = persistableFixableAtom<string[], string[]>({
    initialValue: [],
    areEqualFunction: isEqual,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableCurveNamesAtom),
    isValidFunction: ({ value, precomputedValue: availableCurveNames }) => {
        return value.length > 0 && value.every((curveName) => availableCurveNames.includes(curveName));
    },
    fixupFunction: ({ value, precomputedValue: availableCurveNames }) => {
        return fixupUserSelection(value ?? [], availableCurveNames, FixupSelection.SELECT_ALL) ?? [];
    },
});

export const selectedSatnumsAtom = persistableFixableAtom<number[], number[]>({
    initialValue: [],
    areEqualFunction: isEqual,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableSatnumsAtom),
    isValidFunction: ({ value, precomputedValue: availableSatnums }) => {
        return value.length > 0 && value.every((satnum) => availableSatnums.includes(satnum));
    },
    fixupFunction: ({ value, precomputedValue: availableSatnums }) => {
        const validSatnums = (value ?? []).filter((satnum) => availableSatnums.includes(satnum));
        return validSatnums.length > 0 ? validSatnums : availableSatnums.slice(0, 1);
    },
});

// A disabled or not yet resolved query is "blocked", not "loaded" - otherwise an atom settles before its options exist
// (e.g. while the table definitions wait for a table name on first load) and keeps an empty value afterwards
function computeTableNamesQueryDependenciesState({ get }: { get: Getter }): PersistableAtomDependenciesState {
    return computeQueriesDependenciesState(get(relPermTableNamesQueriesAtom));
}

function computeTableDefinitionsQueryDependenciesState({ get }: { get: Getter }): PersistableAtomDependenciesState {
    return computeQueriesDependenciesState(get(relPermTableDefinitionQueriesAtom));
}
