import { EnsembleIdent } from "@framework/EnsembleIdent";

export enum RealizationSelection {
    Aggregated = "Aggregated",
    Single = "Single",
}

export type State = {
    ensembleIdent: EnsembleIdent | null;
    realizationSelection: RealizationSelection;
    realizationToInclude: number | null;
};
