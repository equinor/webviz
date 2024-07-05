import { EnsembleIdent } from "@framework/EnsembleIdent";

export enum SubplotBy {
    SOURCE = "source",
    INDEX = "index",
}

export type SubplotByInfo = {
    subplotBy: SubplotBy;
    indexName?: string;
};

export type EnsembleIdentWithRealizations = {
    ensembleIdent: EnsembleIdent;
    realizations: readonly number[];
};
