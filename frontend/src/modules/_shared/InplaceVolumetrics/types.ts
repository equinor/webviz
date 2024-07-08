import { InplaceVolumetricTableDataPerFluidSelection_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolumetricsTableData = {
    ensembleIdent: EnsembleIdent;
    tableName: string;
    data: InplaceVolumetricTableDataPerFluidSelection_api;
};
