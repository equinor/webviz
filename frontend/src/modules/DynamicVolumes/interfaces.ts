import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    groupByAtom,
    selectedStatisticsAtom,
    showHistogramAtom,
    visualizationModeAtom,
} from "./settings/atoms/baseAtoms";
import type { GroupBy, StatisticsType, VisualizationMode } from "./typesAndEnums";

type SettingsToViewInterface = {
    visualizationMode: VisualizationMode;
    groupBy: GroupBy;
    selectedStatistics: StatisticsType[];
    showHistogram: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    visualizationMode: (get) => get(visualizationModeAtom),
    groupBy: (get) => get(groupByAtom),
    selectedStatistics: (get) => get(selectedStatisticsAtom),
    showHistogram: (get) => get(showHistogramAtom),
};
