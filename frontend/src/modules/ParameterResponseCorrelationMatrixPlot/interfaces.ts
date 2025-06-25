import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    parameterIdentsAtom,
    showLabelsAtom,
    showSelfCorrelationAtom,
    useFixedColorRangeAtom,
    plotTypeAtom,
} from "./settings/atoms/baseAtoms";
import type { PlotType } from "./typesAndEnums";

type SettingsToViewInterface = {
    parameterIdents: ParameterIdent[];
    plotType: PlotType;
    showLabels: boolean;
    showSelfCorrelation: boolean;
    useFixedColorRange: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    parameterIdents: (get) => get(parameterIdentsAtom),
    showLabels: (get) => get(showLabelsAtom),
    showSelfCorrelation: (get) => get(showSelfCorrelationAtom),
    useFixedColorRange: (get) => get(useFixedColorRangeAtom),
    plotType: (get) => get(plotTypeAtom),
};
