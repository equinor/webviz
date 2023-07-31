import { EnsembleIdent } from "@framework/EnsembleIdent";

export enum RealizationSelection {
    Aggregated = "Aggregated",
    Single = "Single",
}

export type QueryParams = {
    ensembleIdent: EnsembleIdent | null;
    realizationSelection: RealizationSelection;
    realizationToInclude: number | null;
};

export type SettingsParams = {
    timeStep: number;
};

export type State = {
    // queryParams: QueryParams;
    ensembleIdent: EnsembleIdent | null;
    realizationSelection: RealizationSelection;
    realizationToInclude: number | null;

    // settingsParams: SettingsParams;
    timeStep: string | null;
};

// export type State = {
//     ensembleIdent: EnsembleIdent | null;
//     realizationSelection: RealizationSelection;
//     realizationToInclude: number | null;
// };
