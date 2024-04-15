import { InplaceVolumetricData_api, InplaceVolumetricTableDefinition_api } from "@api";
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

export type InplaceDataCollection = {
    ensembleIdent: EnsembleIdent;
    tableData: InplaceVolumetricData_api | null;
};
export type CombinedInplaceDataResults = {
    dataCollections: InplaceDataCollection[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};
export enum PlotGroupingEnum {
    None = "None",
    ENSEMBLE = "Ensemble",
    // TABLE = "Table",
    ZONE = "Zone",
    REGION = "Region",
}
