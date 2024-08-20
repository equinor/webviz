import { EnsembleIdent } from "@framework/EnsembleIdent";
import { IntersectionType } from "@framework/types/intersection";

import { atom } from "jotai";

export const intersectionTypeAtom = atom<IntersectionType>(IntersectionType.WELLBORE);
export const editCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);

export const ensembleIdentAtom = atom<EnsembleIdent | null>(null);
export const highlightedWellboreUuidAtom = atom<string | null>(null);
export const customIntersectionPolylineIdAtom = atom<string | null>(null);
