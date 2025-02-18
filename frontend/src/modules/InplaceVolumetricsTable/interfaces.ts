import { InplaceVolumetricResultName_api, InplaceVolumetricStatistic_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { SourceAndTableIdentifierUnion, SourceIdentifier, TableType } from "@modules/_shared/InplaceVolumetrics/types";

import { selectedStatisticOptionsAtom, selectedTableTypeAtom } from "./settings/atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    areTableDefinitionSelectionsValidAtom,
    selectedAccumulationOptionsAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultNamesAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";
import { InplaceVolumetricsFilterSelections } from "./types";

export type SettingsToViewInterface = {
    filter: InplaceVolumetricsFilterSelections;
    resultNames: InplaceVolumetricResultName_api[];
    accumulationOptions: Omit<SourceAndTableIdentifierUnion, SourceIdentifier.ENSEMBLE | SourceIdentifier.TABLE_NAME>[];
    tableType: TableType;
    statisticOptions: InplaceVolumetricStatistic_api[];
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
    resultNames: (get) => get(selectedResultNamesAtom),
    accumulationOptions: (get) => get(selectedAccumulationOptionsAtom),
    tableType: (get) => get(selectedTableTypeAtom),
    statisticOptions: (get) => get(selectedStatisticOptionsAtom),
    areTableDefinitionSelectionsValid: (get) => get(areTableDefinitionSelectionsValidAtom),
};
