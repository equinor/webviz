import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type InplaceVolumesFilterSettings = {
    ensembleIdents: RegularEnsembleIdent[];
    tableNames: string[];
    indicesWithValues: InplaceVolumesIndexWithValues_api[];
    allowIndicesValuesIntersection: boolean;
};
