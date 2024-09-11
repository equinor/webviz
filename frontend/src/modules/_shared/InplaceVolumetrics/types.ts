import {
    InplaceStatisticalVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricStatistic_api,
    InplaceVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricsIdentifier_api,
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

export enum RealSelector {
    REAL = "REAL",
}
export const selectorColumns = { ...RealSelector, ...InplaceVolumetricsIdentifier_api } as const;
export type SelectorColumn = (typeof selectorColumns)[keyof typeof selectorColumns];

export const AccumulationOption = {
    FLUID_ZONE: "FLUID_ZONE",
    ...InplaceVolumetricsIdentifier_api,
};

export type StatisticalColumns = Partial<{
    [key in InplaceVolumetricStatistic_api]: Column<number>;
}>;

export type StatisticalTableColumnData = {
    // Statistical tables has two types of columns:
    // - Non statistical columns: Column with name and row values (e.g. ensemble, table, fluid zone, etc.)
    // - Statistical columns: Map with result name as key, and its statistical columns as value. One column per statistical type (e.g. mean, min, max, etc.)
    nonStatisticalColumns: Column[];
    resultStatisticalColumns: Map<string, StatisticalColumns>;
};

export const InplaceVolumetricStatisticEnumToStringMapping = {
    [InplaceVolumetricStatistic_api.MEAN]: "Mean",
    [InplaceVolumetricStatistic_api.MIN]: "Min",
    [InplaceVolumetricStatistic_api.MAX]: "Max",
    [InplaceVolumetricStatistic_api.STDDEV]: "Stddev",
    [InplaceVolumetricStatistic_api.P10]: "P10",
    [InplaceVolumetricStatistic_api.P90]: "P90",
};
