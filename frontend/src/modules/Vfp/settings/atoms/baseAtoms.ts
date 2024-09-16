import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { PressureOption, VfpParam } from "@modules/Vfp/types";

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

export const userSelectedThpIndicesAtom = atom<number[] | null>(null);

export const userSelectedWfrIndicesAtom = atom<number[] | null>(null);

export const userSelectedGfrIndicesAtom = atom<number[] | null>(null);

export const userSelectedAlqIndicesAtom = atom<number[] | null>(null);

export const userSelectedPressureOptionAtom = atom<PressureOption | null>(null);

export const userSelectedColorByAtom = atom<VfpParam | null>(null);
