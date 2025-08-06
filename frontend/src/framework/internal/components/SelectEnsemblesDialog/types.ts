import type { UserDeltaEnsembleSetting, UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

export type InternalRegularEnsembleSetting = UserEnsembleSetting & {
    caseName: string;
};

// Internal type for tracking previously explored regular ensembles not among selected
export type ExploredRegularEnsembleInfo = Omit<InternalRegularEnsembleSetting, "customName" | "color">;

// Internal type before applying created delta ensemble externally
export type InternalDeltaEnsembleSetting = Omit<
    UserDeltaEnsembleSetting,
    "comparisonEnsembleIdent" | "referenceEnsembleIdent"
> & {
    comparisonEnsembleIdent: RegularEnsembleIdent | null; // Allows null
    referenceEnsembleIdent: RegularEnsembleIdent | null; // Allows null
    uuid: string; // To allow for equal comparison and reference ensembles during editing in the dialog
};
