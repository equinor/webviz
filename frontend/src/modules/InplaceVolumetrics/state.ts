import { InplaceVolumetricsCategoricalMetaData_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export interface State {
    ensembleIdent: EnsembleIdent | null;
    tableName: string | null;
    responseName: string | null;
    categoricalOptions: InplaceVolumetricsCategoricalMetaData_api[] | null;
    categoricalFilter: InplaceVolumetricsCategoricalMetaData_api[] | null;
    realizationsToInclude: number[] | null;
}
