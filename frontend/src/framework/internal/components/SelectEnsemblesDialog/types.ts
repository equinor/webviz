import type { UserDeltaEnsembleSetting, UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type InternalRegularEnsembleSetting = UserEnsembleSetting & {
    caseName: string;
};

// Internal type before applying created delta ensemble externally
export type InternalDeltaEnsembleSetting = UserDeltaEnsembleSetting & {
    comparisonEnsembleIdent: RegularEnsembleIdent | null; // Allows null
    referenceEnsembleIdent: RegularEnsembleIdent | null; // Allows null
    uuid: string; // To allow for equal comparison and reference ensembles during editing in the dialog
};
