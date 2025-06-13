import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { SelectorColumn, TableSourceAndIndexUnion } from "@modules/_shared/InplaceVolumes/types";

import { userSelectedPlotTypeAtom } from "./settings/atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    areTableDefinitionSelectionsValidAtom,
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedIndicesWithValuesAtom,
    selectedResultName2Atom,
    selectedResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";
import type { InplaceVolumesFilterSelections, PlotType } from "./typesAndEnums";

export type SettingsToViewInterface = {
    filter: InplaceVolumesFilterSelections;
    resultName: string | null;
    resultName2: string | null;
    selectorColumn: SelectorColumn | null;
    subplotBy: TableSourceAndIndexUnion;
    colorBy: TableSourceAndIndexUnion;
    plotType: PlotType;
    areTableDefinitionSelectionsValid: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    filter: (get) => {
        return {
            ensembleIdents: get(selectedEnsembleIdentsAtom),
            tableNames: get(selectedTableNamesAtom),
            indicesWithValues: get(selectedIndicesWithValuesAtom),
            areSelectedTablesComparable: get(areSelectedTablesComparableAtom),
        };
    },
    resultName: (get) => get(selectedResultNameAtom),
    resultName2: (get) => get(selectedResultName2Atom),
    selectorColumn: (get) => get(selectedSelectorColumnAtom),
    subplotBy: (get) => get(selectedSubplotByAtom),
    colorBy: (get) => get(selectedColorByAtom),
    plotType: (get) => get(userSelectedPlotTypeAtom),
    areTableDefinitionSelectionsValid: (get) => get(areTableDefinitionSelectionsValidAtom),
};
