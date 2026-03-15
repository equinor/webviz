import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { HistogramType, StatisticKey } from "@modules/_shared/eCharts";

import {
    histogramBinsAtom,
    histogramTypeAtom,
    numGroupsAtom,
    numRealizationsAtom,
    numSubplotsAtom,
    plotTypeAtom,
    scrollModeAtom,
    selectedStatisticsAtom,
    sharedXAxisAtom,
    sharedYAxisAtom,
    showBarLabelsAtom,
    showFanchartAtom,
    showHistoryAtom,
    showObservationsAtom,
    showRealizationPointsAtom,
    showRealizationsAtom,
    showStatisticalMarkersAtom,
    showStatisticsAtom,
} from "./settings/atoms/baseAtoms";
import type { PlotType } from "./typesAndEnums";

export type SettingsToViewInterface = {
    plotType: PlotType;
    numSubplots: number;
    numGroups: number;
    numRealizations: number;
    showRealizations: boolean;
    showStatistics: boolean;
    showFanchart: boolean;
    showHistory: boolean;
    showObservations: boolean;
    selectedStatistics: StatisticKey[];
    showStatisticalMarkers: boolean;
    showBarLabels: boolean;
    showRealizationPoints: boolean;
    histogramBins: number;
    histogramType: HistogramType;
    sharedXAxis: boolean;
    sharedYAxis: boolean;
    scrollMode: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    plotType: (get) => get(plotTypeAtom),
    numSubplots: (get) => get(numSubplotsAtom),
    numGroups: (get) => get(numGroupsAtom),
    numRealizations: (get) => get(numRealizationsAtom),
    showRealizations: (get) => get(showRealizationsAtom),
    showStatistics: (get) => get(showStatisticsAtom),
    showFanchart: (get) => get(showFanchartAtom),
    showHistory: (get) => get(showHistoryAtom),
    showObservations: (get) => get(showObservationsAtom),
    selectedStatistics: (get) => get(selectedStatisticsAtom),
    showStatisticalMarkers: (get) => get(showStatisticalMarkersAtom),
    showBarLabels: (get) => get(showBarLabelsAtom),
    showRealizationPoints: (get) => get(showRealizationPointsAtom),
    histogramBins: (get) => get(histogramBinsAtom),
    histogramType: (get) => get(histogramTypeAtom),
    sharedXAxis: (get) => get(sharedXAxisAtom),
    sharedYAxis: (get) => get(sharedYAxisAtom),
    scrollMode: (get) => get(scrollModeAtom),
};
