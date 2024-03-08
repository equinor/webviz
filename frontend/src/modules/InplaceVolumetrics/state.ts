import { InplaceVolumetricsCategoryValues_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export type State = {
    selectedEnsembleIdents: EnsembleIdent[];
    selectedTableNames: string[];
    selectedResponseNames: string[];
    selectedCategoricalMetadata: InplaceVolumetricsCategoryValues_api[];
};
