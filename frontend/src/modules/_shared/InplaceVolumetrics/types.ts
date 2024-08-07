import {
    InplaceStatisticalVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricTableDataPerFluidSelection_api,
    InplaceVolumetricsIdentifier_api,
} from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

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
