import { InplaceVolumetricsCategoricalMetaData } from "@api";
import { Ensemble } from "@shared-types/ensemble";

export interface State {
    ensemble: Ensemble | null;
    tableName: string | null;
    responseName: string | null;
    categoricalOptions: InplaceVolumetricsCategoricalMetaData[] | null;
    categoricalFilter: InplaceVolumetricsCategoricalMetaData[] | null;
    realizationsToInclude: number[] | null;
}
