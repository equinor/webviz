import { EnsembleIdent } from "@framework/EnsembleIdent";

import { atom } from "jotai";

export const userSelectedEnsembleIdentAtom = atom<EnsembleIdent | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);
export const userSelectedCustomIntersectionPolylineIdAtom = atom<string | null>(null);
