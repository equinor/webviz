import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";


export interface ViewDisplayableData {
    infoString: string;

    settings_isLoadingDerivedTableHandle: boolean;
    settings_hybridProgressText: string | null;

    settings_isLoadingCalc: boolean;
    settings_calcStatusStr: string | null;
    settings_calcDataStr: string | null;
}

export interface ViewInputData {
    ensembleIdent: RegularEnsembleIdent | null;
    derivedTableHandle: string | null;
    calculationParams: string | null;
}
