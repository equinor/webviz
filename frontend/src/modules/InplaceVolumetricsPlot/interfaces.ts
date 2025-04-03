import type { InplaceVolumetricResultName_api } from "@api";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { SelectorColumn, SourceAndTableIdentifierUnion } from "@modules/_shared/InplaceVolumetrics/types";

import { userSelectedPlotTypeAtom } from "./settings/atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    areTableDefinitionSelectionsValidAtom,
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultName2Atom,
    selectedResultNameAtom,
    selectedSelectorColumnAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";
import type { InplaceVolumetricsFilterSelections, PlotType } from "./typesAndEnums";

export type SettingsToViewInterface = {
    filter: InplaceVolumetricsFilterSelections;
    resultName: InplaceVolumetricResultName_api | null;
    resultName2: InplaceVolumetricResultName_api | null;
    selectorColumn: SelectorColumn | null;
    subplotBy: SourceAndTableIdentifierUnion;
    colorBy: SourceAndTableIdentifierUnion;
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
            fluidZones: get(selectedFluidZonesAtom),
            identifiersValues: get(selectedIdentifiersValuesAtom),
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
