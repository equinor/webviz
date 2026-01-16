import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { plotOptionsAtom, selectedPlotTypeAtom, showTableAtom } from "./settings/atoms/baseAtoms";
import { areSelectedTablesComparableAtom, areTableDefinitionSelectionsValidAtom } from "./settings/atoms/derivedAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedIndicesWithValuesAtom,
    selectedFirstResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/persistableFixableAtoms";
import type { InplaceVolumesFilterSelections, InplaceVolumesPlotOptions, PlotType } from "./typesAndEnums";

export type SettingsToViewInterface = {
    filter: InplaceVolumesFilterSelections;
    firstResultName: string | null;
    selectorColumn: string | null;
    subplotBy: string;
    colorBy: string;
    plotType: PlotType;
    areTableDefinitionSelectionsValid: boolean;
    plotOptions: InplaceVolumesPlotOptions;
    showTable: boolean;
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
    firstResultName: (get) => get(selectedFirstResultNameAtom).value,
    selectorColumn: (get) => get(selectedSelectorColumnAtom).value,
    subplotBy: (get) => get(selectedSubplotByAtom).value,
    colorBy: (get) => get(selectedColorByAtom).value,
    plotType: (get) => get(selectedPlotTypeAtom),
    areTableDefinitionSelectionsValid: (get) => get(areTableDefinitionSelectionsValidAtom),
    plotOptions: (get) => get(plotOptionsAtom),
    showTable: (get) => get(showTableAtom),
};
