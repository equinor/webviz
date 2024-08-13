import {
    InplaceStatisticalVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricsIdentifier_api,
    Statistics_api,
} from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { Column } from "./Table";

export type InplaceVolumetricsTableData = {
    ensembleIdent: EnsembleIdent;
    tableName: string;
    data: InplaceVolumetricTableDataPerFluidSelection_api;
};

export type InplaceVolumetricsStatisticalTableData = {
    ensembleIdent: EnsembleIdent;
    tableName: string;
    data: InplaceStatisticalVolumetricTableDataPerFluidSelection_api;
};

export enum TableType {
    PER_REALIZATION = "PER_REALIZATION",
    STATISTICAL = "STATISTICAL",
}

export const TableTypeToStringMapping = {
    [TableType.PER_REALIZATION]: "Per realization",
    [TableType.STATISTICAL]: "Statistical",
};

export enum SourceIdentifier {
    ENSEMBLE = "ENSEMBLE",
    TABLE_NAME = "TABLE_NAME",
    FLUID_ZONE = "FLUID_ZONE",
}

const sourceAndTableIdentifiersUnion = { ...SourceIdentifier, ...InplaceVolumetricsIdentifier_api };
export type SourceAndTableIdentifierUnion =
    (typeof sourceAndTableIdentifiersUnion)[keyof typeof sourceAndTableIdentifiersUnion];

export type StatisticalColumns = Partial<{
    [key in Statistics_api]: Column<number>;
}>;

export type StatisticalTableColumnData = {
    // Statistical tables has two types of columns:
    // - Non statistical columns: Column with name and row values (e.g. ensemble, table, fluid zone, etc.)
    // - Statistical columns: Map with result name as key, and its statistical columns as value. One column per statistical type (e.g. mean, min, max, etc.)
    nonStatisticalColumns: Column[];
    resultStatisticalColumns: Map<string, StatisticalColumns>;
};
