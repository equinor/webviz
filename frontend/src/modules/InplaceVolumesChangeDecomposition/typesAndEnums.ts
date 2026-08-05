import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type EnsemblePairSelection = {
    referenceEnsembleIdent: RegularEnsembleIdent | null;
    comparisonEnsembleIdent: RegularEnsembleIdent | null;
};

export type DataSelection = {
    tableName: string | null;
    resultName: string | null;
    /** Index column to split the waterfall into one subplot per value, or null for a single waterfall. */
    subplotBy: string | null;
    indicesWithValues: InplaceVolumesIndexWithValues_api[];
};
