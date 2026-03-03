import { atom } from "jotai";

import type { Frequency_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { ColorBy, StatisticsType, VisualizationMode } from "../../typesAndEnums";

// ──────── View-side atoms (synced from settings via interfaceEffects) ────────

export const visualizationModeAtom = atom<VisualizationMode | null>(null);
export const colorByAtom = atom<ColorBy | null>(null);
export const selectedStatisticsAtom = atom<StatisticsType[]>([]);
export const showHistogramAtom = atom<boolean>(true);
export const resampleFrequencyAtom = atom<Frequency_api | null>(null);
export const ensembleIdentsAtom = atom<RegularEnsembleIdent[]>([]);
export const vectorNamesToFetchAtom = atom<string[]>([]);
export const selectedRegionsAtom = atom<number[]>([]);
export const selectedVectorBaseNameAtom = atom<string | null>(null);

// ──────── Local view state ────────

export const selectedTimestepIdxAtom = atom<number | null>(null);
export const showRecoveryFactorAtom = atom<boolean>(false);
