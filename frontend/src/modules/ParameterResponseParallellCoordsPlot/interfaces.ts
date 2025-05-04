import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { corrCutOffAtom, numParamsAtom, plotTypeAtom, showLabelsAtom } from "./settings/atoms/baseAtoms";
import type { PlotType } from "./typesAndEnums";

type SettingsToViewInterface = {
    plotType: PlotType | null;
    numParams: number;
    corrCutOff: number;
    showLabels: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    plotType: (get) => get(plotTypeAtom),
    numParams: (get) => get(numParamsAtom),
    corrCutOff: (get) => get(corrCutOffAtom),
    showLabels: (get) => get(showLabelsAtom),
};
