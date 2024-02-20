import { SurfaceAttributeType_api, SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { SurfaceTimeType } from "@modules/_shared/Surface";

export enum SurfaceAttributeType {
    DEPTH_TIME = "Depth and time maps",
    PROPERTY = "Attribute maps",
}
export const SurfaceAttributeTypeToApi = {
    [SurfaceAttributeType.DEPTH_TIME]: [SurfaceAttributeType_api.DEPTH, SurfaceAttributeType_api.TIME],
    [SurfaceAttributeType.PROPERTY]: [
        SurfaceAttributeType_api.PROPERTY,
        SurfaceAttributeType_api.SEISMIC,
        SurfaceAttributeType_api.ISOCHORE,
    ],
};
export type SurfaceReducerState = {
    ensembleIdents: EnsembleIdent[];
    surfaceSpecifications: SurfaceSpecification[];
    syncedSettings: SyncedSettings;
    timeMode: SurfaceTimeType;
    attributeType: SurfaceAttributeType;
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
    colorRange: [number, number] | null;
    colorPaletteId: string | null;
};
export type SyncedSettings = {
    ensemble: boolean;
    name: boolean;
    attribute: boolean;
    timeOrInterval: boolean;
    realizationNum: boolean;
    colorRange: boolean;
    colorPaletteId: boolean;
};

export enum EnsembleStageType {
    Statistics = "Statistics",
    Realization = "Realization",
    Observation = "Observation",
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
export type EnsembleObservationStage = {
    ensembleStage: EnsembleStageType.Observation;
    realizationNum?: number; // The observation might be tied to a realization (e.g., depth converted)
};

export type EnsembleStage = EnsembleStatisticStage | EnsembleRealizationStage | EnsembleObservationStage;
