import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export enum ColorBy {
    ENSEMBLE = "ensemble",
    CURVE = "curve",
    SATNUM = "satnum",
}
export enum GroupBy {
    NONE = "none",
    ENSEMBLE = "ensemble",
    SATNUM = "satnum",
}
export enum CurveType {
    RELPERM = "relperm",
    CAP_PRESSURE = "cap_pressure",
}
export enum VisualizationType {
    INDIVIDUAL_REALIZATIONS = "individualRealizations",
}
export interface RelPermSpec {
    ensembleIdent: RegularEnsembleIdent;
    tableName: string;
    curveNames: string[];
    satNum: number;
    saturationAxisName: string;
}

export interface VisualizationSettings {
    colorBy: ColorBy;
    groupBy: GroupBy;
    opacity: number;
    lineWidth: number;
}
