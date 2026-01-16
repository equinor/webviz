import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    showLabelsAtom,
    useFixedColorRangeAtom,
    plotTypeAtom,
    selectedParameterIdentsAtom,
    correlationThresholdAtom,
    hideIndividualCellsAtom,
    filterColumnsAtom,
    filterRowsAtom,
} from "./settings/atoms/baseAtoms";
import type { PlotType } from "./typesAndEnums";

type SettingsToViewInterface = {
    parameterIdents: ParameterIdent[];
    plotType: PlotType;
    showLabels: boolean;
    useFixedColorRange: boolean;
    correlationThreshold: number;
    hideIndividualCells: boolean;
    filterColumns: boolean;
    filterRows: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    parameterIdents: (get) => get(selectedParameterIdentsAtom),
    showLabels: (get) => get(showLabelsAtom),
    useFixedColorRange: (get) => get(useFixedColorRangeAtom),
    plotType: (get) => get(plotTypeAtom),
    correlationThreshold: (get) => get(correlationThresholdAtom),
    hideIndividualCells: (get) => get(hideIndividualCellsAtom),
    filterColumns: (get) => get(filterColumnsAtom),
    filterRows: (get) => get(filterRowsAtom),
};
