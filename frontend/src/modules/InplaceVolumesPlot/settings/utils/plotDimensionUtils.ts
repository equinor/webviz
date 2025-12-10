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

    // Allow ENSEMBLE for colorBy if multiple ensembles and single table name, or if not used for subplotBy
    if ((numEnsembleIdents > 1 && numTableNames === 1) || selectedSubplotBy !== TableOriginKey.ENSEMBLE) {
        options.push({
            value: TableOriginKey.ENSEMBLE,
            label: "ENSEMBLE",
        });
    }

    // Allow TABLE_NAME for colorBy if multiple table names and single ensemble, or if not used for subplotBy
    if ((numTableNames > 1 && numEnsembleIdents === 1) || selectedSubplotBy !== TableOriginKey.TABLE_NAME) {
        options.push({
            value: TableOriginKey.TABLE_NAME,
            label: "TABLE NAME",
        });
    }

    if (numEnsembleIdents > 1 && numTableNames > 1) {
        return options;
    }

    // Only skip index options if there are multiples of both, or if the one with multiples is NOT the subplotBy
    const ensembleIsMultipleAndSubplot = numEnsembleIdents > 1 && selectedSubplotBy === TableOriginKey.ENSEMBLE;
    const tableNameIsMultipleAndSubplot = numTableNames > 1 && selectedSubplotBy === TableOriginKey.TABLE_NAME;

    if (
        (numEnsembleIdents > 1 && !ensembleIsMultipleAndSubplot) ||
        (numTableNames > 1 && !tableNameIsMultipleAndSubplot)
    ) {
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
