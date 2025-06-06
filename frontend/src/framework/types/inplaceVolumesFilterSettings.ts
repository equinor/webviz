import type { InplaceVolumesFluid_api, InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type InplaceVolumesFilterSettings = {
    ensembleIdents: RegularEnsembleIdent[];
    tableNames: string[];
    fluids: InplaceVolumesFluid_api[];
    indicesWithValues: InplaceVolumesIndexWithValues_api[];
    allowIndicesValuesIntersection: boolean;
};
