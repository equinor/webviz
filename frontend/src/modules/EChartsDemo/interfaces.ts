import type { StatisticKey } from "@modules/_shared/eCharts";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    numGroupsAtom,
    numRealizationsAtom,
    numSubplotsAtom,
    plotTypeAtom,
    scrollModeAtom,
    selectedStatisticsAtom,
    sharedXAxisAtom,
    sharedYAxisAtom,
    showFanchartAtom,
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
    selectedStatistics: StatisticKey[];
    showStatisticalMarkers: boolean;
    showRealizationPoints: boolean;
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
    selectedStatistics: (get) => get(selectedStatisticsAtom),
    showStatisticalMarkers: (get) => get(showStatisticalMarkersAtom),
    showRealizationPoints: (get) => get(showRealizationPointsAtom),
    sharedXAxis: (get) => get(sharedXAxisAtom),
    sharedYAxis: (get) => get(sharedYAxisAtom),
    scrollMode: (get) => get(scrollModeAtom),
};
