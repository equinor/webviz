import { EnsembleIdent } from "@framework/EnsembleIdent";
import { GridCellIndexRanges } from "@modules/3DViewer/typesAndEnums";

import { atom } from "jotai";

export const userSelectedEnsembleIdentAtom = atom<EnsembleIdent | null>(null);
export const userSelectedRealizationAtom = atom<number | null>(null);
export const userSelectedGridModelNameAtom = atom<string | null>(null);
export const userSelectedGridModelParameterNameAtom = atom<string | null>(null);
export const userSelectedGridModelParameterDateOrIntervalAtom = atom<string | null>(null);
export const userSelectedWellboreUuidsAtom = atom<string[]>([]);
export const userSelectedHighlightedWellboreUuidAtom = atom<string | null>(null);
export const userSelectedCustomIntersectionPolylineIdAtom = atom<string | null>(null);
export const userSelectedGridCellIndexRangesAtom = atom<GridCellIndexRanges | null>(null);
