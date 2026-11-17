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
    // A retained but invalid parameter (e.g. one the received ensembles don't vary) must not be plotted
    parameterIdentString: (get) => {
        const parameterIdentString = get(parameterIdentStringAtom);
        return parameterIdentString.isValidInContext ? parameterIdentString.value : null;
    },
    showTrendline: (get) => get(showTrendlineAtom),
};
