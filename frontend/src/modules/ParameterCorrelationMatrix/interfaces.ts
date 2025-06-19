import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    parameterIdentStringsAtom,
    showLabelsAtom,
    showSelfCorrelationAtom,
    useFixedColorRangeAtom,
} from "./settings/atoms/baseAtoms";

type SettingsToViewInterface = {
    parameterIdentStrings: string[];
    showLabels: boolean;
    showSelfCorrelation: boolean;
    useFixedColorRange: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    parameterIdentStrings: (get) => get(parameterIdentStringsAtom),
    showLabels: (get) => get(showLabelsAtom),
    showSelfCorrelation: (get) => get(showSelfCorrelationAtom),
    useFixedColorRange: (get) => get(useFixedColorRangeAtom),
};
