import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export enum ColorBy {
    ENSEMBLE = "ensemble",
    CURVE = "curve",
    SATNUM = "satnum",
}

export enum VisualizationMode {
    STATISTICAL_FANCHART = "statisticalFanchart",
    INDIVIDUAL_REALIZATIONS = "individualRealizations",
}
export interface RelPermSpec {
    ensembleIdent: RegularEnsembleIdent | DeltaEnsembleIdent;
    tableName: string;
    curveNames: string[];
    satNum: number;
    saturationAxisName: string;
}
