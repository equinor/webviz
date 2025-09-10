import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { selectedPlotTypeAtom } from "./settings/atoms/baseAtoms";
import { areSelectedTablesComparableAtom, areTableDefinitionSelectionsValidAtom } from "./settings/atoms/derivedAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedIndicesWithValuesAtom,
    selectedSecondResultNameAtom,
    selectedFirstResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/persistedAtoms";
import type { InplaceVolumesFilterSelections, PlotType } from "./typesAndEnums";

export type SettingsToViewInterface = {
    filter: InplaceVolumesFilterSelections;
    firstResultName: string | null;
    secondResultName: string | null;
    selectorColumn: string | null;
    subplotBy: string;
    colorBy: string;
    plotType: PlotType;
    areTableDefinitionSelectionsValid: boolean;
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
    secondResultName: (get) => get(selectedSecondResultNameAtom).value,
    selectorColumn: (get) => get(selectedSelectorColumnAtom).value,
    subplotBy: (get) => get(selectedSubplotByAtom).value,
    colorBy: (get) => get(selectedColorByAtom).value,
    plotType: (get) => get(selectedPlotTypeAtom),
    areTableDefinitionSelectionsValid: (get) => get(areTableDefinitionSelectionsValidAtom),
};
