import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";


export interface ViewDisplayableData {
    infoString: string;

    settingsIsLoading: boolean;
    settingsProgressText: string | null;
}

export interface ViewInputData {
    ensembleIdent: RegularEnsembleIdent | null;
    derivedTableHandle: string | null;
    calculationParams: string | null;
}
