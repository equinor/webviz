import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";

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
