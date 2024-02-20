import { EnsembleIdent } from "@framework/EnsembleIdent";

import { atom } from "jotai";

export const userSelectedEnsembleIdentsAtom = atom<EnsembleIdent[]>([]);
export const userSelectedRealizationsAtom = atom<number[]>([]);
export const userSelectedPvtNumsAtom = atom<number[]>([]);
