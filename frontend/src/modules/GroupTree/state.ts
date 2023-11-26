import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Frequency_api } from "@api";
import { Data } from "@webviz/group-tree/dist/redux/types"

export enum StatisticsOrRealization {Statistics="Statistics", Realization="Realization"}

export type State = {
    ensembleIdent: EnsembleIdent|null;
    statOrReal: StatisticsOrRealization;
    realization: number;
    resamplingFrequency: Frequency_api|null;
};
