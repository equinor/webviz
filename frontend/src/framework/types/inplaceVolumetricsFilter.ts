import { FluidZone_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type InplaceVolumetricsFilter = {
    ensembleIdents: RegularEnsembleIdent[];
    tableNames: string[];
    fluidZones: FluidZone_api[];
    identifiersValues: InplaceVolumetricsIdentifierWithValues_api[];
};
