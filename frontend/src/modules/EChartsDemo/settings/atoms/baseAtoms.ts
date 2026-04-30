import { atom } from "jotai";

import { HistogramType } from "@modules/_shared/eCharts";
import type { StatisticKey } from "@modules/_shared/eCharts";

import { PlotType } from "../../typesAndEnums";

export type DataConfig = {
    plotType: PlotType;
    numSubplots: number;
    numGroups: number;
    numMembers: number;
    numTimesteps: number;
};

export type TimeseriesDisplayConfig = {
    showMembers: boolean;
    showStatistics: boolean;
    showFanchart: boolean;
    showReferenceLines: boolean;
    showPointAnnotations: boolean;
    colorByParameter: boolean;
    selectedStatistics: StatisticKey[];
};

export type HistogramDisplayConfig = {
    histogramBins: number;
    histogramType: HistogramType;
};

export type PointsAndLabelsConfig = {
    showStatisticalMarkers: boolean;
    showBarLabels: boolean;
    showMemberPoints: boolean;
    colorByParameter: boolean;
};

export type LayoutConfig = {
    sharedXAxis: boolean;
    sharedYAxis: boolean;
    zoomEnabled: boolean;
    scrollMode: boolean;
};

export const dataConfigAtom = atom<DataConfig>({
    plotType: PlotType.Timeseries,
    numSubplots: 1,
    numGroups: 2,
    numMembers: 50,
    numTimesteps: 100,
});

export const timeseriesDisplayConfigAtom = atom<TimeseriesDisplayConfig>({
    showMembers: true,
    showStatistics: false,
    showFanchart: false,
    showReferenceLines: false,
    showPointAnnotations: false,
    colorByParameter: false,
    selectedStatistics: ["mean", "p10", "p90"],
});

export const histogramDisplayConfigAtom = atom<HistogramDisplayConfig>({
    histogramBins: 10,
    histogramType: HistogramType.Overlay,
});

export const pointsAndLabelsConfigAtom = atom<PointsAndLabelsConfig>({
    showStatisticalMarkers: true,
    showBarLabels: false,
    showMemberPoints: false,
    colorByParameter: false,
});

export const layoutConfigAtom = atom<LayoutConfig>({
    sharedXAxis: false,
    sharedYAxis: false,
    zoomEnabled: true,
    scrollMode: false,
});
