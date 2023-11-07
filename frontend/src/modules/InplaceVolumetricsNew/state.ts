import { EnsembleIdent } from "@framework/EnsembleIdent";

export type State = {
    selectedEnsembleIdents: EnsembleIdent[];
    selectedTableNames: string[];
    selectedResponseNames: string[];
    selectedCategoricalMetadata: {
        name: string;
        unique_values: Array<string | number>;
    }[];
};
