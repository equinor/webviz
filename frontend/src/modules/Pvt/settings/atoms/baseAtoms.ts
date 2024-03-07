import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { isEqual } from "lodash";

function ensembleIdentsListsAreEqual(a: EnsembleIdent[], b: EnsembleIdent[]) {
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

export const userSelectedEnsembleIdentsAtom = atomWithCompare<EnsembleIdent[]>([], ensembleIdentsListsAreEqual);
export const userSelectedRealizationsAtom = atomWithCompare<number[]>([], isEqual);
export const userSelectedPvtNumsAtom = atomWithCompare<number[]>([], isEqual);
