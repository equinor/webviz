import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    showLabelsAtom,
    useFixedColorRangeAtom,
    plotTypeAtom,
    correlationSettingsAtom,
    selectedParameterIdentsAtom,
} from "./settings/atoms/baseAtoms";
import type { PlotType, CorrelationSettings } from "./typesAndEnums";

type SettingsToViewInterface = {
    parameterIdents: ParameterIdent[];
    plotType: PlotType;
    showLabels: boolean;
    useFixedColorRange: boolean;
    correlationSettings: CorrelationSettings;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    parameterIdents: (get) => get(selectedParameterIdentsAtom),
    showLabels: (get) => get(showLabelsAtom),
    useFixedColorRange: (get) => get(useFixedColorRangeAtom),
    plotType: (get) => get(plotTypeAtom),
    correlationSettings: (get) => get(correlationSettingsAtom),
};
