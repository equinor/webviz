import { FluidZone_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolumetricsFilter = {
    ensembleIdents: EnsembleIdent[];
    tableNames: string[];
    fluidZones: FluidZone_api[];
    identifiersValues: InplaceVolumetricsIdentifierWithValues_api[];
};
