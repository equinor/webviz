import { InplaceVolumetricsCategoricalMetaData_api } from "@api";
import { Ensemble } from "@shared-types/ensemble";

export interface State {
    ensemble: Ensemble | null;
    tableName: string | null;
    responseName: string | null;
    categoricalOptions: InplaceVolumetricsCategoricalMetaData_api[] | null;
    categoricalFilter: InplaceVolumetricsCategoricalMetaData_api[] | null;
    realizationsToInclude: number[] | null;
}
