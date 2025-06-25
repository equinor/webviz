import type { DropdownOption } from "@lib/components/Dropdown";
import type { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

export function makeSubplotByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedTableNames: string[],
): DropdownOption<string>[] {
    const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    const numTableNames = selectedTableNames.length;

    const options: DropdownOption<string>[] = [
        {
            value: TableOriginKey.ENSEMBLE,
            label: "ENSEMBLE",
        },
        {
            value: TableOriginKey.TABLE_NAME,
            label: "TABLE NAME",
        },
    ];

    if (numEnsembleIdents > 1 && numTableNames > 1) {
        return options;
    }

    for (const indexWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        options.push({
            value: indexWithValues.indexColumn,
            label: indexWithValues.indexColumn,
        });
    }

    return options;
}

export function makeColorByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedSubplotBy: string,
    selectedTableNames: string[],
): DropdownOption<string>[] {
    const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    const numTableNames = selectedTableNames.length;

    const options: DropdownOption<string>[] = [];

    if (numEnsembleIdents > 1 && selectedSubplotBy !== TableOriginKey.ENSEMBLE) {
        options.push({
            value: TableOriginKey.ENSEMBLE,
            label: "ENSEMBLE",
        });
        return options;
    }

    if (numTableNames > 1 && selectedSubplotBy !== TableOriginKey.TABLE_NAME) {
        options.push({
            value: TableOriginKey.TABLE_NAME,
            label: "TABLE NAME",
        });
        return options;
    }

    if (selectedSubplotBy !== TableOriginKey.ENSEMBLE) {
        options.push({
            value: TableOriginKey.ENSEMBLE,
            label: "ENSEMBLE",
        });
    }

    if (selectedSubplotBy !== TableOriginKey.TABLE_NAME) {
        options.push({
            value: TableOriginKey.TABLE_NAME,
            label: "TABLE NAME",
        });
    }

    if (numEnsembleIdents > 1 && numTableNames > 1) {
        return options;
    }

    for (const indexWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        if (selectedSubplotBy !== indexWithValues.indexColumn) {
            options.push({
                value: indexWithValues.indexColumn,
                label: indexWithValues.indexColumn,
            });
        }
    }

    return options;
}
