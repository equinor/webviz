import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { plotOptionsAtom, selectedPlotTypeAtom, showTableAtom } from "./settings/atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    areTableDefinitionSelectionsValidAtom,
    offeredSelectedIndicesWithValuesAtom,
} from "./settings/atoms/derivedAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
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
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    filter: (get) => {
        return {
            ensembleIdents: get(selectedEnsembleIdentsAtom).value,
            tableNames: get(selectedTableNamesAtom).value,
            // Entries for columns that are not offered must not be queried for
            indicesWithValues: get(offeredSelectedIndicesWithValuesAtom),
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
};
