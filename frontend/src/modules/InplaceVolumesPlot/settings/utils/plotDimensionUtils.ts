// import { InplaceVolumesIndex_api } from "@api";
import type { DropdownOption } from "@lib/components/Dropdown";
import type { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import type { TableSourceAndIndexUnion } from "@modules/_shared/InplaceVolumes/types";
import { TableSource } from "@modules/_shared/InplaceVolumes/types";

export function makeSubplotByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedTableNames: string[],
): DropdownOption<TableSourceAndIndexUnion>[] {
    const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    const numTableNames = selectedTableNames.length;

    if (numEnsembleIdents > 1 && numTableNames > 1) {
        return [
            {
                value: TableSource.ENSEMBLE,
                label: "ENSEMBLE",
            },
            {
                value: TableSource.TABLE_NAME,
                label: "TABLE NAME",
            },
        ];
    }

    const options: DropdownOption<TableSourceAndIndexUnion>[] = [
        {
            value: TableSource.ENSEMBLE,
            label: "ENSEMBLE",
        },
        {
            value: TableSource.TABLE_NAME,
            label: "TABLE NAME",
        },
        // {
        //     value: InplaceVolumesIndex_api.FLUID,
        //     label: "FLUID",
        // },
    ];

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
    selectedSubplotBy: TableSourceAndIndexUnion,
    selectedTableNames: string[],
): DropdownOption<TableSourceAndIndexUnion>[] {
    const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    const numTableNames = selectedTableNames.length;

    const options: DropdownOption<TableSourceAndIndexUnion>[] = [];

    if (numEnsembleIdents > 1 && selectedSubplotBy !== TableSource.ENSEMBLE) {
        options.push({
            value: TableSource.ENSEMBLE,
            label: "ENSEMBLE",
        });
        return options;
    }

    if (numTableNames > 1 && selectedSubplotBy !== TableSource.TABLE_NAME) {
        options.push({
            value: TableSource.TABLE_NAME,
            label: "TABLE NAME",
        });
        return options;
    }

    if (selectedSubplotBy !== TableSource.ENSEMBLE) {
        options.push({
            value: TableSource.ENSEMBLE,
            label: "ENSEMBLE",
        });
    }

    if (selectedSubplotBy !== TableSource.TABLE_NAME) {
        options.push({
            value: TableSource.TABLE_NAME,
            label: "TABLE NAME",
        });
    }

    if (numEnsembleIdents > 1 && numTableNames > 1) {
        return options;
    }

    // if (selectedSubplotBy !== InplaceVolumesIndex_api.FLUID) {
    //     options.push({
    //         value: InplaceVolumesIndex_api.FLUID,
    //         label: "FLUID",
    //     });
    // }

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
