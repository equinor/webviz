import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    barSortByAtom,
    numBinsAtom,
    orientationAtom,
    plotTypeAtom,
    sharedXAxesAtom,
    sharedYAxesAtom,
    statisticsColumnsAtom,
} from "./settings/atoms/baseAtoms";
import type { BarSortBy, PlotType, StatisticsColumn } from "./typesAndEnums";

type SettingsToViewInterface = {
    plotType: PlotType | null;
    numBins: number;
    orientation: "h" | "v";
    sharedXAxes: boolean;
    sharedYAxes: boolean;
    barSortBy: BarSortBy;
    statisticsColumns: StatisticsColumn[];
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    plotType: (get) => get(plotTypeAtom),
    numBins: (get) => get(numBinsAtom),
    orientation: (get) => get(orientationAtom),
    sharedXAxes: (get) => get(sharedXAxesAtom),
    sharedYAxes: (get) => get(sharedYAxesAtom),
    barSortBy: (get) => get(barSortByAtom),
    statisticsColumns: (get) => get(statisticsColumnsAtom),
};
