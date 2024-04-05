import { PvtData_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export enum ColorBy {
    ENSEMBLE = "ensemble",
    PVT_NUM = "pvtNum",
}

export enum PressureDependentVariable {
    FORMATION_VOLUME_FACTOR = "formationVolumeFactor",
    DENSITY = "density",
    VISCOSITY = "viscosity",
    FLUID_RATIO = "fluidRatio",
}

export const PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME: Record<PressureDependentVariable, string> = {
    [PressureDependentVariable.FORMATION_VOLUME_FACTOR]: "Formation Volume Factor",
    [PressureDependentVariable.DENSITY]: "Density",
    [PressureDependentVariable.VISCOSITY]: "Viscosity",
    [PressureDependentVariable.FLUID_RATIO]: "Fluid Ratio",
};

export enum PhaseType {
    OIL = "Oil",
    GAS = "Gas",
    WATER = "Water",
}

export const PHASE_TO_DISPLAY_NAME: Record<PhaseType, string> = {
    [PhaseType.OIL]: "Oil (PVTO)",
    [PhaseType.GAS]: "Gas (PVTG)",
    [PhaseType.WATER]: "Water (PVTW)",
};

export type Phase = {
    name: string;
    phaseType: PhaseType;
};

export type PvtTableCollection = {
    ensembleIdent: EnsembleIdent;
    realization: number;
    tables: PvtData_api[];
};

export type CombinedPvtDataResult = {
    tableCollections: PvtTableCollection[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};
