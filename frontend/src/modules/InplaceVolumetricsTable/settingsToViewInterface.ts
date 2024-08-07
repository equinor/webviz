import { InplaceVolumetricResultName_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";
import { SourceAndTableIdentifierUnion, SourceIdentifier, TableType } from "@modules/_shared/InplaceVolumetrics/types";

import { selectedTableTypeAtom } from "./settings/atoms/baseAtoms";
import {
    selectedAccumulationOptionsAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultNamesAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";

export type SettingsToViewInterface = {
    filter: InplaceVolumetricsFilter;
    resultNames: InplaceVolumetricResultName_api[];
    accumulationOptions: Omit<SourceAndTableIdentifierUnion, SourceIdentifier.ENSEMBLE | SourceIdentifier.TABLE_NAME>[];
    tableType: TableType;
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    filter: (get) => {
        return {
            ensembleIdents: get(selectedEnsembleIdentsAtom),
            tableNames: get(selectedTableNamesAtom),
            fluidZones: get(selectedFluidZonesAtom),
            identifiersValues: get(selectedIdentifiersValuesAtom),
        };
    },
    resultNames: (get) => get(selectedResultNamesAtom),
    accumulationOptions: (get) => get(selectedAccumulationOptionsAtom),
    tableType: (get) => get(selectedTableTypeAtom),
};
