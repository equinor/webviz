import type { ComboboxItem } from "@lib/components/Combobox/types";
import type { TableDefinitionsAccessor } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";

const ORIGIN_KEY_LABELS: Record<string, string> = {
    [TableOriginKey.ENSEMBLE]: "ENSEMBLE",
    [TableOriginKey.TABLE_NAME]: "TABLE NAME",
    [TableOriginKey.SENSITIVITY]: "SENSITIVITY",
};

function makeOriginOption(originKey: TableOriginKey): ComboboxItem<string> {
    return { value: originKey, label: ORIGIN_KEY_LABELS[originKey] };
}

/**
 * Dimensions with multiple values that must be represented by subplotBy or colorBy, otherwise their
 * values would be merged into a single trace. ENSEMBLE and SENSITIVITY never coincide, as
 * sensitivity mode requires a single ensemble.
 */
export function getRequiredDimensions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedTableNames: string[],
    isSensitivityModeActive: boolean,
): TableOriginKey[] {
    const requiredDimensions: TableOriginKey[] = [];
    if (tableDefinitionsAccessor.getUniqueEnsembleIdents().length > 1) {
        requiredDimensions.push(TableOriginKey.ENSEMBLE);
    }
    if (selectedTableNames.length > 1) {
        requiredDimensions.push(TableOriginKey.TABLE_NAME);
    }
    if (isSensitivityModeActive) {
        requiredDimensions.push(TableOriginKey.SENSITIVITY);
    }
    return requiredDimensions;
}

function makeAllOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    isSensitivityModeActive: boolean,
): ComboboxItem<string>[] {
    const options = [makeOriginOption(TableOriginKey.ENSEMBLE), makeOriginOption(TableOriginKey.TABLE_NAME)];
    if (isSensitivityModeActive) {
        options.push(makeOriginOption(TableOriginKey.SENSITIVITY));
    }
    for (const indexWithValues of tableDefinitionsAccessor.getCommonIndicesWithValues()) {
        options.push({ value: indexWithValues.indexColumn, label: indexWithValues.indexColumn });
    }
    return options;
}

export function makeSubplotByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedTableNames: string[],
    isSensitivityModeActive: boolean,
): ComboboxItem<string>[] {
    const requiredDimensions = getRequiredDimensions(
        tableDefinitionsAccessor,
        selectedTableNames,
        isSensitivityModeActive,
    );

    // With two required dimensions, subplotBy must take one of them so colorBy can take the other.
    if (requiredDimensions.length >= 2) {
        return requiredDimensions.map(makeOriginOption);
    }

    return makeAllOptions(tableDefinitionsAccessor, isSensitivityModeActive);
}

export function makeColorByOptions(
    tableDefinitionsAccessor: TableDefinitionsAccessor,
    selectedSubplotBy: string,
    selectedTableNames: string[],
    isSensitivityModeActive: boolean,
): ComboboxItem<string>[] {
    const remainingRequiredDimensions = getRequiredDimensions(
        tableDefinitionsAccessor,
        selectedTableNames,
        isSensitivityModeActive,
    ).filter((dimension) => dimension !== selectedSubplotBy);

    // One remaining dimension forces colorBy. Several remaining (subplotBy not yet fixed up) have no fully
    // valid single selection, so all of them are offered.
    if (remainingRequiredDimensions.length > 0) {
        return remainingRequiredDimensions.map(makeOriginOption);
    }

    // The dimension used as subplotBy is intentionally still offered, so it is possible to color and
    // subplot by the same dimension (handled by GroupedTableData's subplotBy === colorBy case).
    return makeAllOptions(tableDefinitionsAccessor, isSensitivityModeActive);
}
