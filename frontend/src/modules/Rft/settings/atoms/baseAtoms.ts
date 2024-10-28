import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { atom } from "jotai";

function areEnsembleIdentsEqual(a: EnsembleIdent | null, b: EnsembleIdent | null) {
    if (a === null) {
        return b === null;
    }
    return a.equals(b);
}

export const userSelectedEnsembleIdentAtom = atomWithCompare<EnsembleIdent | null>(null, areEnsembleIdentsEqual);
export const validRealizationNumbersAtom = atom<number[] | null>(null);
export const userSelectedResponseNameAtom = atom<string | null>(null);
export const userSelectedWellNameAtom = atom<string | null>(null);
export const userSelectedRftTimestampsUtcMsAtom = atom<number | null>(null);
