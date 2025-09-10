import type { InplaceVolumesStatistic_api } from "@api";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { TableType } from "@modules/_shared/InplaceVolumes/types";

import { selectedStatisticOptionsAtom, selectedTableTypeAtom } from "./settings/atoms/baseAtoms";
import { areSelectedTablesComparableAtom, areTableDefinitionSelectionsValidAtom } from "./settings/atoms/derivedAtoms";
import type { InplaceVolumesFilterSelections } from "./types";
import {
    selectedEnsembleIdentsAtom,
    selectedGroupByIndicesAtom,
    selectedIndicesWithValuesAtom,
    selectedResultNamesAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/persistableAtoms";

export type SettingsToViewInterface = {
    filter: InplaceVolumesFilterSelections;
    resultNames: string[];
    groupByIndices: string[];
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
            ensembleIdents: get(selectedEnsembleIdentsAtom).value,
            tableNames: get(selectedTableNamesAtom).value,
            indicesWithValues: get(selectedIndicesWithValuesAtom).value,
            areSelectedTablesComparable: get(areSelectedTablesComparableAtom),
        };
    },
    resultNames: (get) => get(selectedResultNamesAtom).value,
    groupByIndices: (get) => get(selectedGroupByIndicesAtom).value,
    tableType: (get) => get(selectedTableTypeAtom),
    statisticOptions: (get) => get(selectedStatisticOptionsAtom),
    areTableDefinitionSelectionsValid: (get) => get(areTableDefinitionSelectionsValidAtom),
};
