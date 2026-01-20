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
