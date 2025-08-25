import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { userSelectedPlotTypeAtom } from "./settings/atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    areTableDefinitionSelectionsValidAtom,
    selectedColorByAtom,
    persistedEnsembleIdentsAtom,
    selectedIndicesWithValuesAtom,
    selectedSecondResultNameAtom,
    selectedFirstResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";
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
            ensembleIdents: get(persistedEnsembleIdentsAtom).value,
            tableNames: get(selectedTableNamesAtom),
            indicesWithValues: get(selectedIndicesWithValuesAtom),
            areSelectedTablesComparable: get(areSelectedTablesComparableAtom),
        };
    },
    firstResultName: (get) => get(selectedFirstResultNameAtom),
    secondResultName: (get) => get(selectedSecondResultNameAtom),
    selectorColumn: (get) => get(selectedSelectorColumnAtom),
    subplotBy: (get) => get(selectedSubplotByAtom),
    colorBy: (get) => get(selectedColorByAtom),
    plotType: (get) => get(userSelectedPlotTypeAtom),
    areTableDefinitionSelectionsValid: (get) => get(areTableDefinitionSelectionsValidAtom),
};
