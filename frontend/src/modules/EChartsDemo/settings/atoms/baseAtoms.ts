import { atom } from "jotai";

import type { StatisticKey } from "@modules/_shared/eCharts";

import { PlotType } from "../../typesAndEnums";

export const plotTypeAtom = atom<PlotType>(PlotType.Timeseries);
export const numSubplotsAtom = atom<number>(1);
export const numGroupsAtom = atom<number>(2);
export const numRealizationsAtom = atom<number>(50);

export const showRealizationsAtom = atom<boolean>(true);
export const showStatisticsAtom = atom<boolean>(false);
export const showFanchartAtom = atom<boolean>(false);
export const selectedStatisticsAtom = atom<StatisticKey[]>(["mean", "p10", "p90"]);

export const showStatisticalMarkersAtom = atom<boolean>(true);
export const showRealizationPointsAtom = atom<boolean>(false);

export const sharedXAxisAtom = atom<boolean>(false);
export const sharedYAxisAtom = atom<boolean>(false);
export const scrollModeAtom = atom<boolean>(false);
