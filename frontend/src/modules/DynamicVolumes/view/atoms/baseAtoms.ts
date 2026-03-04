import { atom } from "jotai";

import type { Frequency_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { PlotDimension, RegionSelectionMode, StatisticsType, VisualizationMode } from "../../typesAndEnums";

// ──────── View-side atoms (synced from settings via interfaceEffects) ────────

export const visualizationModeAtom = atom<VisualizationMode | null>(null);
export const colorByAtom = atom<PlotDimension | null>(null);
export const subplotByAtom = atom<PlotDimension | null>(null);
export const regionSelectionModeAtom = atom<RegionSelectionMode | null>(null);
export const selectedStatisticsAtom = atom<StatisticsType[]>([]);
export const resampleFrequencyAtom = atom<Frequency_api | null>(null);
export const ensembleIdentsAtom = atom<RegularEnsembleIdent[]>([]);
export const vectorNamesToFetchAtom = atom<string[]>([]);
export const selectedRegionsAtom = atom<number[]>([]);
export const selectedVectorBaseNameAtom = atom<string | null>(null);
export const fipRegionLabelsAtom = atom<Record<number, { zone: string; region: string }>>({});
export const showRecoveryFactorAtom = atom<boolean>(false);
