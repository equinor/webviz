import type { InplaceVolumesStatistic_api } from "@api";
import type { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import type { TableType } from "@modules/_shared/InplaceVolumes/types";

export type SettingsState = {
    selectedEnsembleIdents: string[];
    selectedTableNames: string[];
    selectedIndicesWithValues: string[];
    selectedResultNames: string[];
    selectedGroupByIndices: string[];
    selectedTableType: TableType;
    selectedStatisticOptions: InplaceVolumesStatistic_api[];
    selectedIndexValueCriteria: IndexValueCriteria;
};
