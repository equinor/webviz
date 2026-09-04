import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type InplaceVolumesFilterSettings = {
    ensembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[];
    tableNames: string[];
    indicesWithValues: InplaceVolumesIndexWithValues_api[];
    allowIndicesValuesIntersection: boolean;
};
