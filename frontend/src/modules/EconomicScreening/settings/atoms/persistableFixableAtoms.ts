import { atom } from "jotai";

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

/** The selected ensemble while it is in the ensemble set, otherwise null. Queries and results use only this. */
export const validSelectedEnsembleIdentAtom = atom<RegularEnsembleIdent | DeltaEnsembleIdent | null>((get) => {
    const selection = get(selectedEnsembleIdentAtom);
    return selection.isValidInContext ? selection.value : null;
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
        const ensembleIdent = get(validSelectedEnsembleIdentAtom);
        if (!ensembleIdent || ensembleIdent.toString() !== value.ensembleIdentString) {
            return false;
        }
        return get(ValidEnsembleRealizationsFunctionAtom)(ensembleIdent).includes(value.realization);
    },
    fixupFunction: ({ get }) => {
        return { ensembleIdentString: get(validSelectedEnsembleIdentAtom)?.toString() ?? null, realization: null };
    },
});
