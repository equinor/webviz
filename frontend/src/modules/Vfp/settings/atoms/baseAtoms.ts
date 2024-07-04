import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { atom } from "jotai";

function areEnsembleIdentsEqual(a: EnsembleIdent | null, b: EnsembleIdent | null) {
    if (a === null) {
        return b === null;
    }
    return a.equals(b);
}

export const userSelectedRealizationNumberAtom = atom<number | null>(null);

export const validRealizationNumbersAtom = atom<number[] | null>(null);

export const userSelectedEnsembleIdentAtom = atomWithCompare<EnsembleIdent | null>(null, areEnsembleIdentsEqual);

export const userSelectedVfpTableNameAtom = atom<string | null>(null);

export const validVfpTableNamesAtom = atom<string[] | null>(null);
