import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export interface VectorSpec {
    ensembleIdent: RegularEnsembleIdent;
    vectorName: string;
    hasHistorical: boolean;
}
