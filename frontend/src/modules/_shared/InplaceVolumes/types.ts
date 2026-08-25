import type {
    InplaceVolumesStatisticalTableDataPerFluidSelection_api,
    InplaceVolumesTableDataPerFluidSelection_api,
} from "@api";
import { InplaceVolumesStatistic_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { Column } from "./Table";

export type InplaceVolumesTableData = {
    ensembleIdent: RegularEnsembleIdent;
    tableName: string;
    data: InplaceVolumesTableDataPerFluidSelection_api;
};

export type InplaceVolumesStatisticalTableData = {
    ensembleIdent: RegularEnsembleIdent;
    tableName: string;
    data: InplaceVolumesStatisticalTableDataPerFluidSelection_api;
};

export enum TableType {
    PER_REALIZATION = "PER_REALIZATION",
    STATISTICAL = "STATISTICAL",
}

export const TableTypeToStringMapping = {
    [TableType.PER_REALIZATION]: "Per realization",
    [TableType.STATISTICAL]: "Statistical",
};

// Enum defining keys to identify the origin of the table data received from the API.
// - Each query fetch table data for pair: ensemble + table name
// - The query result: Table data per fluid
export enum TableOriginKey {
    ENSEMBLE = "ENSEMBLE",
    TABLE_NAME = "TABLE_NAME",
    FLUID = "FLUID",
}

// Properties that are only defined for one specific fluid. The backend discards these results when
// the fluids are summed, so the data must be grouped by FLUID for them to be computed at all.
export const FLUID_SPECIFIC_RESULT_NAMES: Record<string, string> = {
    BO: "oil",
    BG: "gas",
};

export function isFluidSpecificResultName(resultName: string | null): boolean {
    return resultName !== null && resultName in FLUID_SPECIFIC_RESULT_NAMES;
}

// Ratios and fractions, i.e. the backend Property enum. Never large enough for SI prefixes.
const DIMENSIONLESS_RESULT_NAMES: readonly string[] = [
    "NTG",
    "PORO",
    "PORO_NET",
    "SW",
    "BO",
    "BG",
    "FACIES_FRACTION",
];

export function isDimensionlessResultName(resultName: string | null): boolean {
    return resultName !== null && DIMENSIONLESS_RESULT_NAMES.includes(resultName);
}

export type StatisticalColumns = Partial<{
    [key in InplaceVolumesStatistic_api]: Column<number>;
}>;

export type StatisticalTableColumnData = {
    // Statistical tables has two types of columns:
    // - Non statistical columns: Column with name and row values (e.g. ensemble, table, fluid, etc.)
    // - Statistical columns: Map with result name as key, and its statistical columns as value. One column per statistical type (e.g. mean, min, max, etc.)
    nonStatisticalColumns: Column[];
    resultStatisticalColumns: Map<string, StatisticalColumns>;
};

export const InplaceVolumesStatisticEnumToStringMapping = {
    [InplaceVolumesStatistic_api.MEAN]: "Mean",
    [InplaceVolumesStatistic_api.MIN]: "Min",
    [InplaceVolumesStatistic_api.MAX]: "Max",
    [InplaceVolumesStatistic_api.STDDEV]: "Stddev",
    [InplaceVolumesStatistic_api.P10]: "P10",
    [InplaceVolumesStatistic_api.P90]: "P90",
};
