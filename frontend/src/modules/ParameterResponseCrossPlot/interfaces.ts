import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { plotTypeAtom, showTrendlineAtom } from "./settings/atoms/baseAtoms";
import { parameterIdentStringAtom } from "./settings/atoms/persistedAtoms";
import type { PlotType } from "./typesAndEnums";

type SettingsToViewInterface = {
    plotType: PlotType | null;
    parameterIdentString: string | null;
    showTrendline: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    plotType: (get) => get(plotTypeAtom),
    parameterIdentString: (get) => get(parameterIdentStringAtom).value,
    showTrendline: (get) => get(showTrendlineAtom),
};
