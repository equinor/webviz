import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import type {
    DataConfig,
    HistogramDisplayConfig,
    LayoutConfig,
    PointsAndLabelsConfig,
    TimeseriesDisplayConfig,
} from "./settings/atoms/baseAtoms";
import {
    dataConfigAtom,
    histogramDisplayConfigAtom,
    layoutConfigAtom,
    pointsAndLabelsConfigAtom,
    timeseriesDisplayConfigAtom,
} from "./settings/atoms/baseAtoms";

export type SettingsToViewInterface = {
    dataConfig: DataConfig;
    timeseriesDisplayConfig: TimeseriesDisplayConfig;
    histogramDisplayConfig: HistogramDisplayConfig;
    pointsAndLabelsConfig: PointsAndLabelsConfig;
    layoutConfig: LayoutConfig;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    dataConfig: (get) => get(dataConfigAtom),
    timeseriesDisplayConfig: (get) => get(timeseriesDisplayConfigAtom),
    histogramDisplayConfig: (get) => get(histogramDisplayConfigAtom),
    pointsAndLabelsConfig: (get) => get(pointsAndLabelsConfigAtom),
    layoutConfig: (get) => get(layoutConfigAtom),
};
