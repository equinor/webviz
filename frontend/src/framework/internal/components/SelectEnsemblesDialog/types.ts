import type { UserDeltaEnsembleSetting, UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

// Internal type with required caseName for regular ensembles
export type InternalRegularEnsembleSetting = Omit<UserEnsembleSetting, "caseName"> & {
    caseName: string;
};

// Internal type for selectable ensembles for delta, additional to already selected regular ensembles
export type EnsembleIdentWithCaseName = { ensembleIdent: RegularEnsembleIdent; caseName: string };

// Internal type before applying created delta ensemble externally
export type InternalDeltaEnsembleSetting = Omit<
    UserDeltaEnsembleSetting,
    "comparisonEnsembleIdent" | "referenceEnsembleIdent" | "comparisonEnsembleCaseName" | "referenceEnsembleCaseName"
> & {
    comparisonEnsembleIdent: RegularEnsembleIdent | null; // Allows null
    referenceEnsembleIdent: RegularEnsembleIdent | null; // Allows null
    comparisonEnsembleCaseName: string | null; // Allows null
    referenceEnsembleCaseName: string | null; // Allows null
    uuid: string; // To allow for equal comparison and reference ensembles during editing in the dialog
};
