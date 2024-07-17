import { InplaceVolumetricTableDataPerFluidSelection_api, InplaceVolumetricsIdentifier_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolumetricsTableData = {
    ensembleIdent: EnsembleIdent;
    tableName: string;
    data: InplaceVolumetricTableDataPerFluidSelection_api;
};

export enum SourceIdentifier {
    ENSEMBLE = "ENSEMBLE",
    TABLE_NAME = "TABLE_NAME",
    FLUID_ZONE = "FLUID_ZONE",
}

const sourceAndTableIdentifiersUnion = { ...SourceIdentifier, ...InplaceVolumetricsIdentifier_api };
export type SourceAndTableIdentifierUnion =
    (typeof sourceAndTableIdentifiersUnion)[keyof typeof sourceAndTableIdentifiersUnion];
