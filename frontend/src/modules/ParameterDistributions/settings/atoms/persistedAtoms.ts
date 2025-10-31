import { persistableFixableAtom } from "@framework/utils/atomUtils";

import type { ParameterIdent } from "@framework/EnsembleParameters";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { EnsembleMode } from "@modules/ParameterDistributions/typesAndEnums";
import { ParameterSortMethod } from "@modules/ParameterDistributions/view/utils/parameterSorting";

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

export const selectedEnsembleModeAtom = persistableFixableAtom<EnsembleMode>({
    initialValue: EnsembleMode.INDEPENDENT,
    isValidFunction: ({ value }) => {
        return Object.values(EnsembleMode).includes(value);
    },
    fixupFunction: ({ value }) => {
        if (value && Object.values(EnsembleMode).includes(value)) {
            return value;
        }
        return EnsembleMode.INDEPENDENT;
    },
});

export const selectedParameterIdentsAtom = persistableFixableAtom<ParameterIdent[] | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const intersectedParameterIdents = get(intersectedParameterIdentsAtom);
        if (!value) {
            return false;
        }
        if (value.length === 0) {
            return true;
        }
        return value.every((ident) => intersectedParameterIdents.includes(ident));
    },
    fixupFunction: ({ value, get }) => {
        const intersectedParameterIdents = get(intersectedParameterIdentsAtom);
        if (!value) {
            return intersectedParameterIdents;
        }
        if (value.length === 0) {
            return [];
        }

        return value.filter((ident) => intersectedParameterIdents.some((ipi) => ipi.equals(ident)));
    },
});

export const selectedParameterSortingMethodAtom = persistableFixableAtom<ParameterSortMethod>({
    initialValue: ParameterSortMethod.ALPHABETICAL,
    isValidFunction: ({ value, get }) => {
        const ensembleMode = get(selectedEnsembleModeAtom).value;
        if (ensembleMode === EnsembleMode.INDEPENDENT) {
            return value === ParameterSortMethod.ALPHABETICAL;
        }
        return Object.values(ParameterSortMethod).includes(value);
    },
    fixupFunction: ({ value, get }) => {
        const ensembleMode = get(selectedEnsembleModeAtom).value;
        if (ensembleMode === EnsembleMode.INDEPENDENT || !value) {
            return ParameterSortMethod.ALPHABETICAL;
        }
        return value;
    },
});
