import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolumetricsFilter = {
    ensembleIdents: EnsembleIdent[];
    tableSources: string[];
    indexFilters: Record<string, string[]>;
};
