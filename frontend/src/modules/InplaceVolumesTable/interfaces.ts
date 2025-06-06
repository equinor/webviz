import type { InplaceVolumesIndex_api, InplaceVolumesStatistic_api } from "@api";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { TableType } from "@modules/_shared/InplaceVolumes/types";

import { selectedStatisticOptionsAtom, selectedTableTypeAtom } from "./settings/atoms/baseAtoms";
import {
    areSelectedTablesComparableAtom,
    areTableDefinitionSelectionsValidAtom,
    selectedAccumulationOptionsAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidsAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNamesAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";
import type { InplaceVolumesFilterSelections } from "./types";

export type SettingsToViewInterface = {
    filter: InplaceVolumesFilterSelections;
    resultNames: string[];
    accumulationOptions: InplaceVolumesIndex_api[];
    tableType: TableType;
    statisticOptions: InplaceVolumesStatistic_api[];
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
            fluids: get(selectedFluidsAtom),
            indicesWithValues: get(selectedIndicesWithValuesAtom),
            areSelectedTablesComparable: get(areSelectedTablesComparableAtom),
        };
    },
    resultNames: (get) => get(selectedResultNamesAtom),
    accumulationOptions: (get) => get(selectedAccumulationOptionsAtom),
    tableType: (get) => get(selectedTableTypeAtom),
    statisticOptions: (get) => get(selectedStatisticOptionsAtom),
    areTableDefinitionSelectionsValid: (get) => get(areTableDefinitionSelectionsValidAtom),
};
