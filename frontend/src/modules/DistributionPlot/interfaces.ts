import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { numBinsAtom, orientationAtom, plotTypeAtom } from "./settings/atoms/baseAtoms";
import { PlotType } from "./typesAndEnums";

type SettingsToViewInterface = {
    plotType: PlotType | null;
    numBins: number;
    orientation: "h" | "v";
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    plotType: (get) => get(plotTypeAtom),
    numBins: (get) => get(numBinsAtom),
    orientation: (get) => get(orientationAtom),
};
