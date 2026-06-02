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

    const ensembleOption: DropdownOption<string> = { value: TableOriginKey.ENSEMBLE, label: "ENSEMBLE" };
    const tableNameOption: DropdownOption<string> = { value: TableOriginKey.TABLE_NAME, label: "TABLE NAME" };

    // A dimension with multiple values (ensemble or table) must be represented by either subplotBy
    // or colorBy, otherwise its values would be merged into a single trace and become indistinguishable.
    const ensembleNeedsRepresentation = numEnsembleIdents > 1 && selectedSubplotBy !== TableOriginKey.ENSEMBLE;
    const tableNeedsRepresentation = numTableNames > 1 && selectedSubplotBy !== TableOriginKey.TABLE_NAME;

    // Both multiple dimensions still need representation but only one can be colorBy: offer both
    // origin options (there is no fully valid single selection in this case).
    if (ensembleNeedsRepresentation && tableNeedsRepresentation) {
        return [ensembleOption, tableNameOption];
    }

    // Exactly one multiple dimension still needs representation: colorBy is forced to that dimension.
    if (ensembleNeedsRepresentation) {
        return [ensembleOption];
    }
    if (tableNeedsRepresentation) {
        return [tableNameOption];
    }

    // No multiple dimension needs representation: allow both origin options and all common index
    // columns. The dimension used as subplotBy is intentionally still offered, so it is possible to
    // color and subplot by the same dimension (handled by GroupedTableData's subplotBy === colorBy case).
    const options: DropdownOption<string>[] = [ensembleOption, tableNameOption];

    for (const indexWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        options.push({
            value: indexWithValues.indexColumn,
            label: indexWithValues.indexColumn,
        });
    }

    return options;
}
