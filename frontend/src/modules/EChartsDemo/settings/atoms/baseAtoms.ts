import { atom } from "jotai";

import { HistogramType } from "@modules/_shared/eCharts";
import type { StatisticKey } from "@modules/_shared/eCharts";

import { PlotType } from "../../typesAndEnums";

export type DataConfig = {
    plotType: PlotType;
    numSubplots: number;
    numGroups: number;
    numRealizations: number;
};

export type TimeseriesDisplayConfig = {
    showRealizations: boolean;
    showStatistics: boolean;
    showFanchart: boolean;
    showReferenceLines: boolean;
    showPointAnnotations: boolean;
    selectedStatistics: StatisticKey[];
};

export type HistogramDisplayConfig = {
    histogramBins: number;
    histogramType: HistogramType;
};

export type PointsAndLabelsConfig = {
    showStatisticalMarkers: boolean;
    showBarLabels: boolean;
    showRealizationPoints: boolean;
};

export type LayoutConfig = {
    sharedXAxis: boolean;
    sharedYAxis: boolean;
    scrollMode: boolean;
};

export const dataConfigAtom = atom<DataConfig>({
    plotType: PlotType.Timeseries,
    numSubplots: 1,
    numGroups: 2,
    numRealizations: 50,
});

export const timeseriesDisplayConfigAtom = atom<TimeseriesDisplayConfig>({
    showRealizations: true,
    showStatistics: false,
    showFanchart: false,
    showReferenceLines: false,
    showPointAnnotations: false,
    selectedStatistics: ["mean", "p10", "p90"],
});

export const histogramDisplayConfigAtom = atom<HistogramDisplayConfig>({
    histogramBins: 10,
    histogramType: HistogramType.Overlay,
});

export const pointsAndLabelsConfigAtom = atom<PointsAndLabelsConfig>({
    showStatisticalMarkers: true,
    showBarLabels: false,
    showRealizationPoints: false,
});

export const layoutConfigAtom = atom<LayoutConfig>({
    sharedXAxis: false,
    sharedYAxis: false,
    scrollMode: false,
});
