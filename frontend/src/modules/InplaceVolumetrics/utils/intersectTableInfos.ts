import { InplaceVolumetricsIndex_api, InplaceVolumetricsTableDefinition_api } from "@api";

import { InplaceVolTableInfoCollection } from "../typesAndEnums";

// Helper function to determine if two InplaceVolumetricTableDefinitions are equal
function areTablesEqual(
    table1: InplaceVolumetricsTableDefinition_api,
    table2: InplaceVolumetricsTableDefinition_api
): boolean {
    if (
        table1.name !== table2.name ||
        table1.indexes.length !== table2.indexes.length ||
        table1.result_names.length !== table2.result_names.length
    ) {
        return false;
    }

    for (let i = 0; i < table1.indexes.length; i++) {
        if (
            table1.indexes[i].index_name !== table2.indexes[i].index_name ||
            table1.indexes[i].values.length !== table2.indexes[i].values.length ||
            !table1.indexes[i].values.every((val, idx) => val === table2.indexes[i].values[idx])
        ) {
            return false;
        }
    }

    for (let i = 0; i < table1.result_names.length; i++) {
        if (table1.result_names[i] !== table2.result_names[i]) {
            return false;
        }
    }

    return true;
}

// Returns tables that are present and identical across all collections
export function findCommonTablesAcrossCollections(
    tableInfoCollections: InplaceVolTableInfoCollection[]
): InplaceVolumetricsTableDefinition_api[] {
    if (tableInfoCollections.length === 0) {
        return [];
    }

    let commonTables: InplaceVolumetricsTableDefinition_api[] = [...tableInfoCollections[0].tableInfos];

    for (let i = 1; i < tableInfoCollections.length; i++) {
        commonTables = commonTables.filter((baseTable) =>
            tableInfoCollections[i].tableInfos.some((compareTable) => areTablesEqual(baseTable, compareTable))
        );
    }

    return commonTables;
}
