import { EnsembleIdent } from "@framework/EnsembleIdent";

import { atom } from "jotai";

export const addCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);
export const editCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);

export const currentCustomIntersectionPolylineAtom = atom<number[][]>([]);

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const userSelectedEnsembleIdentAtom = atom<EnsembleIdent | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);
export const userSelectedCustomIntersectionPolylineIdAtom = atom<string | null>(null);
