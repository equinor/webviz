import { DropdownOption } from "@lib/components/Dropdown";
import { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumetrics/TableDefinitionsAccessor";
import { SourceAndTableIdentifierUnion, SourceIdentifier } from "@modules/_shared/InplaceVolumetrics/types";

export function makeSubplotByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedTableNames: string[]
): DropdownOption<SourceAndTableIdentifierUnion>[] {
    const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    const numTableNames = selectedTableNames.length;

    if (numEnsembleIdents > 1 && numTableNames > 1) {
        return [
            {
                value: SourceIdentifier.ENSEMBLE,
                label: "ENSEMBLE",
            },
            {
                value: SourceIdentifier.TABLE_NAME,
                label: "TABLE NAME",
            },
        ];
    }

    const options: DropdownOption<SourceAndTableIdentifierUnion>[] = [
        {
            value: SourceIdentifier.ENSEMBLE,
            label: "ENSEMBLE",
        },
        {
            value: SourceIdentifier.TABLE_NAME,
            label: "TABLE NAME",
        },
        {
            value: SourceIdentifier.FLUID_ZONE,
            label: "FLUID ZONE",
        },
    ];

    for (const identifier of tableDefinitionsAccessor.getIdentifiersWithIntersectionValues()) {
        options.push({
            value: identifier.identifier,
            label: identifier.identifier,
        });
    }

    return options;
}

export function makeColorByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedSubplotBy: SourceAndTableIdentifierUnion,
    selectedTableNames: string[]
): DropdownOption<SourceAndTableIdentifierUnion>[] {
    const numEnsembleIdents = tableDefinitionsAccessor.getUniqueEnsembleIdents().length;
    const numTableNames = selectedTableNames.length;

    const options: DropdownOption<SourceAndTableIdentifierUnion>[] = [];

    if (numEnsembleIdents > 1 && selectedSubplotBy !== SourceIdentifier.ENSEMBLE) {
        options.push({
            value: SourceIdentifier.ENSEMBLE,
            label: "ENSEMBLE",
        });
        return options;
    }

    if (numTableNames > 1 && selectedSubplotBy !== SourceIdentifier.TABLE_NAME) {
        options.push({
            value: SourceIdentifier.TABLE_NAME,
            label: "TABLE NAME",
        });
        return options;
    }

    if (selectedSubplotBy !== SourceIdentifier.ENSEMBLE) {
        options.push({
            value: SourceIdentifier.ENSEMBLE,
            label: "ENSEMBLE",
        });
    }

    if (selectedSubplotBy !== SourceIdentifier.TABLE_NAME) {
        options.push({
            value: SourceIdentifier.TABLE_NAME,
            label: "TABLE NAME",
        });
    }

    if (numEnsembleIdents > 1 && numTableNames > 1) {
        return options;
    }

    if (selectedSubplotBy !== SourceIdentifier.FLUID_ZONE) {
        options.push({
            value: SourceIdentifier.FLUID_ZONE,
            label: "FLUID ZONE",
        });
    }

    for (const identifier of tableDefinitionsAccessor.getIdentifiersWithIntersectionValues()) {
        if (selectedSubplotBy !== identifier.identifier) {
            options.push({
                value: identifier.identifier,
                label: identifier.identifier,
            });
        }
    }

    return options;
}
