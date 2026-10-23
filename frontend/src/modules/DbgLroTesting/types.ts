import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";


export interface ViewDisplayableData {
    isFetchingCombinedTableHandle: boolean;
    hybridStatusStr: string | null;
    hybridProgressText: string | null;

    isFetchingInfo: boolean;
    infoStatusStr: string | null;
    infoDataStr: string | null;

    isFetchingCalc: boolean;
    calcStatusStr: string | null;
    calcDataStr: string | null;

    debugInfoStr: string;
}

export interface ViewInputData {
    ensembleIdent: RegularEnsembleIdent | null;
    combinedTableHandle: string | null;
    calculationParams: string | null;
}
