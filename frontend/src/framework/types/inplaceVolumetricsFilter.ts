import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolumetricsFilter = {
    ensembleIdents: EnsembleIdent[];
    tableSources: string[];
    fluidZones: string[];
    indexFilters: Record<string, string[]>;
};
