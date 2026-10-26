import type { ParameterIdent } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { EnsembleMode } from "@modules/ParameterDistributions/typesAndEnums";
import { ParameterSortMethod } from "@modules/ParameterDistributions/view/utils/parameterSorting";

import { selectedEnsembleModeAtom } from "./baseAtoms";
import { intersectedParameterIdentsAtom } from "./derivedAtoms";

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

export const selectedPriorEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        if (value === null) {
            if (!ensembleSet?.hasAnyRegularEnsembles()) {
                return true;
            }
            return false;
        }

        return ensembleSet.hasEnsemble(value);
    },
    fixupFunction: ({ value, get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        if (!ensembleSet?.hasAnyRegularEnsembles()) {
            return null;
        }
        if (value && ensembleSet.hasEnsemble(value)) {
            return value;
        }
        if (ensembleSet.getRegularEnsembleArray().length > 0) {
            return ensembleSet.getRegularEnsembleArray()[0].getIdent();
        }
        return null;
    },
});

export const selectedPosteriorEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        if (value === null) {
            if (!ensembleSet?.hasAnyRegularEnsembles()) {
                return true;
            }
            return false;
        }

        return ensembleSet.hasEnsemble(value);
    },
    fixupFunction: ({ value, get }) => {
        const ensembleSet = get(EnsembleSetAtom);
        if (!ensembleSet?.hasAnyRegularEnsembles()) {
            return null;
        }
        if (value && ensembleSet.hasEnsemble(value)) {
            return value;
        }
        return ensembleSet.getRegularEnsembleArray().at(-1)?.getIdent() || null;
    },
});

export const selectedParameterIdentsAtom = persistableFixableAtom<ParameterIdent[] | null>({
    initialValue: null,
    // The parameters come from the ensembles of the current mode. While they are invalid (or not selected yet), there
    // are no parameters to check the selection against - so it waits, rather than settling on an empty selection.
    computeDependenciesState: ({ get }) => {
        if (get(selectedEnsembleModeAtom) === EnsembleMode.PRIOR_POSTERIOR) {
            const prior = get(selectedPriorEnsembleIdentAtom);
            const posterior = get(selectedPosteriorEnsembleIdentAtom);
            const areBothValid =
                prior.value !== null &&
                posterior.value !== null &&
                prior.isValidInContext &&
                posterior.isValidInContext;
            return areBothValid ? "loaded" : "blocked";
        }
        return get(selectedEnsembleIdentsAtom).isValidInContext ? "loaded" : "blocked";
    },
    isValidFunction: ({ get, value }) => {
        const intersectedParameterIdents = get(intersectedParameterIdentsAtom);
        if (!value) {
            return false;
        }
        if (value.length === 0) {
            return true;
        }
        return value.every((ident) => intersectedParameterIdents.some((elm) => elm.equals(ident)));
    },
    fixupFunction: ({ value, get }) => {
        const intersectedParameterIdents = get(intersectedParameterIdentsAtom);
        if (!value) {
            return intersectedParameterIdents;
        }
        if (value.length === 0) {
            return [];
        }

        return value.filter((ident) => intersectedParameterIdents.some((elm) => elm.equals(ident)));
    },
});

export const selectedParameterSortingMethodAtom = persistableFixableAtom<ParameterSortMethod>({
    initialValue: ParameterSortMethod.ALPHABETICAL,
    isValidFunction: ({ value, get }) => {
        const ensembleMode = get(selectedEnsembleModeAtom);
        if (ensembleMode === EnsembleMode.INDEPENDENT) {
            return value === ParameterSortMethod.ALPHABETICAL;
        }
        return Object.values(ParameterSortMethod).includes(value);
    },
    fixupFunction: ({ value, get }) => {
        const ensembleMode = get(selectedEnsembleModeAtom);
        if (ensembleMode === EnsembleMode.INDEPENDENT || !value) {
            return ParameterSortMethod.ALPHABETICAL;
        }
        return value;
    },
});
