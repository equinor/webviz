import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    barSortByAtom,
    numBinsAtom,
    orientationAtom,
    plotTypeAtom,
    sharedXAxesAtom,
    sharedYAxesAtom,
} from "./settings/atoms/baseAtoms";
import type { BarSortBy, PlotType } from "./typesAndEnums";

type SettingsToViewInterface = {
    plotType: PlotType | null;
    numBins: number;
    orientation: "h" | "v";
    sharedXAxes: boolean;
    sharedYAxes: boolean;
    barSortBy: BarSortBy;
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
};
