// Base item for ensemble data
export type BaseEnsembleItem = {
    caseUuid: string;
    ensembleName: string;
};

export type DeltaEnsembleItem = {
    comparisonEnsemble: BaseEnsembleItem;
    referenceEnsemble: BaseEnsembleItem;
    color: string;
    customName: string | null;
};
export type RegularEnsembleItem = BaseEnsembleItem & {
    caseName: string;
    color: string;
    customName: string | null;
};

// Internal type before applying created delta ensemble externally
export type InternalDeltaEnsembleItem = {
    comparisonEnsemble: BaseEnsembleItem | null; // Allows null
    referenceEnsemble: BaseEnsembleItem | null; // Allows null
    uuid: string; // To allow for equal comparison and reference ensembles during editing in the dialog
    color: string;
    customName: string | null;
};
