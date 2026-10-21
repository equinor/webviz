import type { Getter } from "jotai";

import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { PersistableAtomDependenciesState } from "@framework/utils/atomUtils";
import { computeQueriesDependenciesState, persistableFixableAtom } from "@framework/utils/atomUtils";
import { areEnsembleIdentListsEqual } from "@framework/utils/ensembleIdentUtils";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { fixupUserSelection } from "@lib/utils/fixupUserSelection";

import { availableResponseNamesAtom, availableTimestampsUtcMsAtom, availableWellNamesAtom } from "./derivedAtoms";
import { rftTableDefinitionQueriesAtom } from "./queryAtoms";

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

export const selectedResponseNameAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableResponseNamesAtom),
    isValidFunction: ({ value, precomputedValue: availableResponseNames }) => {
        return value !== null && availableResponseNames.includes(value);
    },
    fixupFunction: ({ value, precomputedValue: availableResponseNames }) => {
        const fixedSelection = fixupUserSelection([value], availableResponseNames);
        return fixedSelection?.[0] ?? null;
    },
});

export const selectedWellNameAtom = persistableFixableAtom<string | null, string[]>({
    initialValue: null,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableWellNamesAtom),
    isValidFunction: ({ value, precomputedValue: availableWellNames }) => {
        return value !== null && availableWellNames.includes(value);
    },
    fixupFunction: ({ value, precomputedValue: availableWellNames }) => {
        const fixedSelection = fixupUserSelection([value], availableWellNames);
        return fixedSelection?.[0] ?? null;
    },
});

export const selectedTimestampUtcMsAtom = persistableFixableAtom<number | null, number[]>({
    initialValue: null,
    computeDependenciesState: computeTableDefinitionsQueryDependenciesState,
    precomputeFunction: ({ get }) => get(availableTimestampsUtcMsAtom),
    isValidFunction: ({ value, precomputedValue: availableTimestamps }) => {
        return value !== null && availableTimestamps.includes(value);
    },
    fixupFunction: ({ value, precomputedValue: availableTimestamps }) => {
        const fixedSelection = fixupUserSelection([value], availableTimestamps);
        return fixedSelection?.[0] ?? null;
    },
});

function computeTableDefinitionsQueryDependenciesState({ get }: { get: Getter }): PersistableAtomDependenciesState {
    return computeQueriesDependenciesState(get(rftTableDefinitionQueriesAtom));
}

