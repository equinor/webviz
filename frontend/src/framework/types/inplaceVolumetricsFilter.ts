import { FluidZone_api, InplaceVolumetricsIndex_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolumetricsFilter = {
    ensembleIdents: EnsembleIdent[];
    tableNames: string[];
    fluidZones: FluidZone_api[];
    indexFilters: InplaceVolumetricsIndex_api[];
};
