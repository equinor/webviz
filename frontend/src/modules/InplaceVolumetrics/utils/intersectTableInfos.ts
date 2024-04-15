import { InplaceVolumetricTableDefinition_api, InplaceVolumetricsCategoryValues_api } from "@api";

import { InplaceVolTableInfoCollection } from "../typesAndEnums";

// Helper function to determine if two InplaceVolumetricTableDefinitions are equal
function areTablesEqual(
    table1: InplaceVolumetricTableDefinition_api,
    table2: InplaceVolumetricTableDefinition_api
): boolean {
    if (
        table1.name !== table2.name ||
        table1.categories.length !== table2.categories.length ||
        table1.result_names.length !== table2.result_names.length
    ) {
        return false;
    }

    for (let i = 0; i < table1.categories.length; i++) {
        if (
            table1.categories[i].category_name !== table2.categories[i].category_name ||
            table1.categories[i].unique_values.length !== table2.categories[i].unique_values.length ||
            !table1.categories[i].unique_values.every((val, idx) => val === table2.categories[i].unique_values[idx])
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
): InplaceVolumetricTableDefinition_api[] {
    if (tableInfoCollections.length === 0) {
        return [];
    }

    let commonTables: InplaceVolumetricTableDefinition_api[] = [...tableInfoCollections[0].tableInfos];

    for (let i = 1; i < tableInfoCollections.length; i++) {
        commonTables = commonTables.filter((baseTable) =>
            tableInfoCollections[i].tableInfos.some((compareTable) => areTablesEqual(baseTable, compareTable))
        );
    }

    return commonTables;
}
