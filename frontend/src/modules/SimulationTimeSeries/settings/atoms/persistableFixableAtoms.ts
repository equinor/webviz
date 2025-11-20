import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { areEnsembleIdentListsEqual } from "@framework/utils/ensembleIdentUtils";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";

import { filteredParameterIdentListAtom } from "./baseAtoms";

export const selectedEnsembleIdentsAtom = persistableFixableAtom<(RegularEnsembleIdent | DeltaEnsembleIdent)[]>({
    initialValue: [],
    areEqualFunction: areEnsembleIdentListsEqual,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return value.every((ident) => ensembleSet.hasEnsemble(ident));
    },
    fixupFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return fixupEnsembleIdents(value ?? null, ensembleSet) ?? [];
    },
});

export const selectedParameterIdentStringAtom = persistableFixableAtom<string | null>({
    initialValue: null,
    isValidFunction: ({ get, value }) => {
        const filteredParameterIdentList = get(filteredParameterIdentListAtom);

        return value === null || filteredParameterIdentList.some((ident) => ident.toString() === value);
    },
    fixupFunction: ({ get, value }) => {
        const filteredParameterIdentList = get(filteredParameterIdentListAtom);

        if (filteredParameterIdentList.length === 0) {
            return null;
        }
        if (value === null || value === undefined) {
            return filteredParameterIdentList[0].toString();
        }
        if (filteredParameterIdentList.some((elm) => elm.toString() === value)) {
            return value;
        }
        return filteredParameterIdentList[0].toString();
    },
});
