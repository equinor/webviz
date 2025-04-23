import { atom } from "jotai";

import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IntersectionType } from "@framework/types/intersection";


export const intersectionTypeAtom = atom<IntersectionType>(IntersectionType.WELLBORE);
export const editCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);

export const ensembleIdentAtom = atom<RegularEnsembleIdent | null>(null);
export const highlightedWellboreUuidAtom = atom<string | null>(null);
export const customIntersectionPolylineIdAtom = atom<string | null>(null);
