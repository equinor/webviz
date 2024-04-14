import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { atom } from "jotai";

function areEnsembleIdentListsEqual(a: EnsembleIdent[], b: EnsembleIdent[]) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (!a[i].equals(b[i])) {
            return false;
        }
    }
    return true;
}

export const userSelectedEnsembleIdentsAtom = atomWithCompare<EnsembleIdent[]>([], areEnsembleIdentListsEqual);
export const userSelectedParameterIdentsAtom = atom<ParameterIdent[]>([]);
export const showConstantParametersAtom = atom<boolean>(false);
