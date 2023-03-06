import { InplaceVolumetricsCategoricalMetaData } from "@api";

export interface State {
    ensembleName: string | null;
    tableName: string | null;
    responseName: string | null;
    categoricalOptions: InplaceVolumetricsCategoricalMetaData[] | null;
    categoricalFilter: InplaceVolumetricsCategoricalMetaData[] | null;
    realizationsToInclude: number[] | null;
}