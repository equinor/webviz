import type { DropdownOption } from "@lib/components/Dropdown";
import type { TagOption } from "@lib/components/TagPicker";
import type { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

/**
 * Formats a column name for display by capitalizing the first letter
 * and converting the rest to lowercase
 */
function formatColumnLabel(columnName: string): string {
    if (!columnName) return columnName;
    return columnName.charAt(0).toUpperCase() + columnName.slice(1).toLowerCase();
}

export function makeSubplotByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedTableNames: string[],
): TagOption[] {
    // const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    // const numTableNames = selectedTableNames.length;

    const options: TagOption[] = [
        {
            value: TableOriginKey.ENSEMBLE,
            label: "Ensemble",
        },
        {
            value: TableOriginKey.TABLE_NAME,
            label: "Table Source",
        },
    ];

    for (const indexWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        options.push({
            value: indexWithValues.indexColumn,
            label: formatColumnLabel(indexWithValues.indexColumn),
        });
    }

    return options;
}

export function makeColorByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedSubplotBy: string[],
    selectedTableNames: string[],
): DropdownOption<string>[] {
    // const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    // const numTableNames = selectedTableNames.length;

    const options: DropdownOption<string>[] = [];

    options.push({
        value: TableOriginKey.ENSEMBLE,
        label: "Ensemble",
    });

    options.push({
        value: TableOriginKey.TABLE_NAME,
        label: "Table Source",
    });

    for (const indexWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        if (!selectedSubplotBy.includes(indexWithValues.indexColumn)) {
            options.push({
                value: indexWithValues.indexColumn,
                label: formatColumnLabel(indexWithValues.indexColumn),
            });
        }
    }

    return options;
}
