import { SurfaceAttributeType_api, SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { TimeType } from "@modules/_shared/Surface";

export type SurfaceReducerState = {
    ensembleIdents: EnsembleIdent[];
    surfaceSpecifications: SurfaceSpecification[];
    syncedSettings: SyncedSettings;
    timeMode: TimeType;
    attributeType: SurfaceAttributeType_api;
    colorScaleGradientType: ColorScaleGradientType;
};

export type SurfaceSpecification = {
    ensembleIdent: EnsembleIdent | null;
    surfaceName: string | null;
    surfaceAttribute: string | null;
    surfaceTimeOrInterval: string | null;
    realizationNum: number | null;
    uuid: string;
    statisticFunction: SurfaceStatisticFunction_api;
    ensembleStage: EnsembleStageType;
    colorMin: number | null;
    colorMax: number | null;
};
export type SyncedSettings = {
    ensemble: boolean;
    name: boolean;
    attribute: boolean;
    timeOrInterval: boolean;
    realizationNum: boolean;
};

export enum EnsembleStageType {
    Statistics = "Statistics",
    Realization = "Realization",
    // Observation = "Observation",
}

export type EnsembleStatisticStage = {
    ensembleStage: EnsembleStageType.Statistics;
    statisticFunction: SurfaceStatisticFunction_api;
    realizationNums: number[];
};

export type EnsembleRealizationStage = {
    ensembleStage: EnsembleStageType.Realization;
    realizationNum: number;
};
// export type EnsembleObservationStage = {
//     ensembleStage: EnsembleStageType.Observation;
//     realizationNum?: number; // The observation might be tied to a realization (e.g., depth converted)
// };

export type EnsembleStage = EnsembleStatisticStage | EnsembleRealizationStage; //| EnsembleObservationStage;
