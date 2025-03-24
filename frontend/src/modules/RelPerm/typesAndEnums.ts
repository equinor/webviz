import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export enum ColorBy {
    ENSEMBLE = "ensemble",
    CURVE = "curve",
    SATNUM = "satnum",
}
export enum CurveType {
    RELPERM = "relperm",
    CAP_PRESSURE = "cap_pressure",
}
export enum VisualizationType {
    STATISTICAL_FANCHART = "statisticalFanchart",
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
    opacity: number;
    lineWidth: number;
}
