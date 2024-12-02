import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { atom } from "jotai";

function areEnsembleIdentsEqual(a: RegularEnsembleIdent | null, b: RegularEnsembleIdent | null) {
    if (a === null) {
        return b === null;
    }
    return a.equals(b);
}

export const userSelectedEnsembleIdentAtom = atomWithCompare<RegularEnsembleIdent | null>(null, areEnsembleIdentsEqual);
export const validRealizationNumbersAtom = atom<number[] | null>(null);
export const userSelectedResponseNameAtom = atom<string | null>(null);
export const userSelectedWellNameAtom = atom<string | null>(null);
export const userSelectedRftTimestampsUtcMsAtom = atom<number | null>(null);
