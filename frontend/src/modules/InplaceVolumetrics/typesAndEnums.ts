import { InplaceVolumetricTableDefinition_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolTableInfoCollection = {
    ensembleIdent: EnsembleIdent;
    tableInfos: InplaceVolumetricTableDefinition_api[];
};

export type CombinedInplaceVolTableInfoResults = {
    tableInfoCollections: InplaceVolTableInfoCollection[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};

export enum PlotGroupingEnum {
    None = "None",
    ENSEMBLE = "Ensemble",
    // TABLE = "Table",
    ZONE = "ZONE",
    REGION = "REGION",
}

export type EnsembleIdentWithRealizations = {
    ensembleIdent: EnsembleIdent;
    realizations: number[];
};
