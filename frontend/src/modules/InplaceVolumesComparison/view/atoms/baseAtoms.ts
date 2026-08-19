import { atom } from "jotai";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { WaterfallFactorSpec } from "../utils/computeVolumeChangeDecomposition";

export const referenceEnsembleIdentAtom = atom<RegularEnsembleIdent | null>(null);
export const comparisonEnsembleIdentAtom = atom<RegularEnsembleIdent | null>(null);
export const referenceTableNameAtom = atom<string | null>(null);
export const comparisonTableNameAtom = atom<string | null>(null);
export const resultNameAtom = atom<string | null>(null);
export const subplotByAtom = atom<string | null>(null);
export const indicesWithValuesAtom = atom<InplaceVolumesIndexWithValues_api[]>([]);
export const waterfallFactorSpecAtom = atom<WaterfallFactorSpec | null>(null);
export const areSourcesDistinctAtom = atom<boolean>(false);
export const areSelectedTablesComparableAtom = atom<boolean>(true);
export const showTableAtom = atom<boolean>(false);
