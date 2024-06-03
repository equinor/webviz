import { InplaceVolumetricData_api, InplaceVolumetricsTableDefinition_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export type InplaceVolTableInfoCollection = {
    ensembleIdent: EnsembleIdent;
    tableInfos: InplaceVolumetricsTableDefinition_api[];
};

export type CombinedInplaceVolTableInfoResults = {
    tableInfoCollections: InplaceVolTableInfoCollection[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};
export enum PlotTypeEnum {
    HISTOGRAM = "Histogram",
    Box = "Box",
}
export enum PlotGroupingEnum {
    ENSEMBLE = "Ensemble",
    ZONE = "ZONE",
    REGION = "REGION",
    FACIES = "FACIES",
}

export type EnsembleIdentWithRealizations = {
    ensembleIdent: EnsembleIdent;
    realizations: number[];
};

export type InplaceVolDataEnsembleSet = {
    ensembleIdentString: string;
    data: InplaceVolumetricData_api | null;
};
export type CombinedInplaceVolDataEnsembleSetResults = {
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
    ensembleSetData: InplaceVolDataEnsembleSet[];
};
