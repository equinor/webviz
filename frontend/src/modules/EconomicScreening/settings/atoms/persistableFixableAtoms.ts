import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom, ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import type { RealizationSelection } from "@modules/EconomicScreening/typesAndEnums";

export const selectedEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | DeltaEnsembleIdent | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        if (!value) {
            return false;
        }
        return get(EnsembleSetAtom).hasEnsemble(value);
    },
    fixupFunction: ({ get, value }) => {
        return fixupEnsembleIdent(value ?? null, get(EnsembleSetAtom));
    },
});

/**
 * Display-only realization choice. It is valid only for the ensemble it was chosen in and while the
 * realization passes the filter; otherwise Aggregate is shown. It never changes calculations or channels.
 */
export const selectedRealizationAtom = persistableFixableAtom<RealizationSelection>({
    initialValue: { ensembleIdentString: null, realization: null },
    areEqualFunction: (first, second) =>
        first.ensembleIdentString === second.ensembleIdentString && first.realization === second.realization,
    isValidFunction: ({ get, value }) => {
        if (value.realization === null) {
            return true;
        }
        const ensembleIdent = get(selectedEnsembleIdentAtom).value;
        if (!ensembleIdent || ensembleIdent.toString() !== value.ensembleIdentString) {
            return false;
        }
        return get(ValidEnsembleRealizationsFunctionAtom)(ensembleIdent).includes(value.realization);
    },
    fixupFunction: ({ get }) => {
        return { ensembleIdentString: get(selectedEnsembleIdentAtom).value?.toString() ?? null, realization: null };
    },
});
