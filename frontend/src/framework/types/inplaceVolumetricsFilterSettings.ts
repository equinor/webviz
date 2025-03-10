import type { FluidZone_api, InplaceVolumetricsIdentifierWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type InplaceVolumetricsFilterSettings = {
    ensembleIdents: RegularEnsembleIdent[];
    tableNames: string[];
    fluidZones: FluidZone_api[];
    identifiersValues: InplaceVolumetricsIdentifierWithValues_api[];
    allowIdentifierValuesIntersection: boolean;
};
