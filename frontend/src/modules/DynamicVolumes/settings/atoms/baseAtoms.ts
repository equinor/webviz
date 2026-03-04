import { atom } from "jotai";

import { Frequency_api } from "@api";

import { PlotDimension, RegionSelectionMode, StatisticsType, VisualizationMode } from "../../typesAndEnums";

export const resampleFrequencyAtom = atom<Frequency_api>(Frequency_api.MONTHLY);

export const visualizationModeAtom = atom<VisualizationMode>(VisualizationMode.StatisticalLines);

export const colorByAtom = atom<PlotDimension>(PlotDimension.Ensemble);

export const subplotByAtom = atom<PlotDimension | null>(null);

export const regionSelectionModeAtom = atom<RegionSelectionMode>(RegionSelectionMode.FipNumber);

export const selectedStatisticsAtom = atom<StatisticsType[]>([
    StatisticsType.Mean,
    StatisticsType.P10,
    StatisticsType.P90,
]);

export const showRecoveryFactorAtom = atom<boolean>(false);
