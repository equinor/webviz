import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { SensitivitySelection } from "@modules/_shared/InplaceVolumes/sensitivityUtils";

import { plotOptionsAtom, selectedPlotTypeAtom, showTableAtom } from "./settings/atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    areTableDefinitionSelectionsValidAtom,
    isSensitivityEnsembleSelectionBlockedAtom,
    sensitivitySelectionAtom,
} from "./settings/atoms/derivedAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/persistableFixableAtoms";
import type { InplaceVolumesFilterSelections, InplaceVolumesPlotOptions, PlotType } from "./typesAndEnums";

export type SettingsToViewInterface = {
    filter: InplaceVolumesFilterSelections;
    resultName: string | null;
    selectorColumn: string | null;
    subplotBy: string;
    colorBy: string;
    plotType: PlotType;
    areTableDefinitionSelectionsValid: boolean;
    plotOptions: InplaceVolumesPlotOptions;
    showTable: boolean;
    sensitivitySelection: SensitivitySelection | null;
    isSensitivityEnsembleSelectionBlocked: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    filter: (get) => {
        return {
            ensembleIdents: get(selectedEnsembleIdentsAtom).value,
            tableNames: get(selectedTableNamesAtom).value,
            indicesWithValues: get(selectedIndicesWithValuesAtom).value,
            areSelectedTablesComparable: get(areSelectedTablesComparableAtom),
        };
    },
    resultName: (get) => get(selectedResultNameAtom).value,
    selectorColumn: (get) => get(selectedSelectorColumnAtom).value,
    subplotBy: (get) => get(selectedSubplotByAtom).value,
    colorBy: (get) => get(selectedColorByAtom).value,
    plotType: (get) => get(selectedPlotTypeAtom),
    areTableDefinitionSelectionsValid: (get) => get(areTableDefinitionSelectionsValidAtom),
    plotOptions: (get) => get(plotOptionsAtom),
    showTable: (get) => get(showTableAtom),
    sensitivitySelection: (get) => get(sensitivitySelectionAtom),
    isSensitivityEnsembleSelectionBlocked: (get) => get(isSensitivityEnsembleSelectionBlockedAtom),
};
