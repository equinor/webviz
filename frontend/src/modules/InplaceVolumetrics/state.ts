import { InplaceVolumetricsCategoricalMetaData } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export interface State {
    ensembleIdent: EnsembleIdent | null;
    tableName: string | null;
    responseName: string | null;
    categoricalOptions: InplaceVolumetricsCategoricalMetaData[] | null;
    categoricalFilter: InplaceVolumetricsCategoricalMetaData[] | null;
    realizationsToInclude: number[] | null;
}
