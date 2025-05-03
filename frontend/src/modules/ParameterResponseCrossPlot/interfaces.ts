import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { parameterIdentStringAtom, plotTypeAtom } from "./settings/atoms/baseAtoms";
import type { PlotType } from "./typesAndEnums";
import { parameterIdentAtom } from "@modules/SimulationTimeSeries/settings/atoms/derivedAtoms";

type SettingsToViewInterface = {
    plotType: PlotType | null;
    parameterIdentString: string | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    plotType: (get) => get(plotTypeAtom),
    parameterIdentString: (get) => get(parameterIdentStringAtom),
};
