import { atom } from "jotai";

import { BarSortBy, PlotType, StatisticsColumn } from "@modules/DistributionPlot/typesAndEnums";

export const plotTypeAtom = atom<PlotType>(PlotType.Histogram);
export const numBinsAtom = atom<number>(10);
export const orientationAtom = atom<"h" | "v">("h");
export const sharedXAxesAtom = atom<boolean>(false);
export const sharedYAxesAtom = atom<boolean>(false);
export const barSortByAtom = atom<BarSortBy>(BarSortBy.Value);
export const statisticsColumnsAtom = atom<StatisticsColumn[]>([
    StatisticsColumn.Mean,
    StatisticsColumn.P10,
    StatisticsColumn.P50,
    StatisticsColumn.P90,
]);
