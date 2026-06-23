import { atom } from "jotai";

import { GroupBy, PhaseType, PressureDependentVariable } from "@modules/Pvt/typesAndEnums";

export const selectedPhaseAtom = atom<PhaseType>(PhaseType.OIL);
export const selectedGroupByAtom = atom<GroupBy>(GroupBy.ENSEMBLE);
export const selectedDependentVariablesAtom = atom<PressureDependentVariable[]>([
    PressureDependentVariable.FORMATION_VOLUME_FACTOR,
    PressureDependentVariable.DENSITY,
    PressureDependentVariable.VISCOSITY,
    PressureDependentVariable.FLUID_RATIO,
]);
