import { atom } from "jotai";

import { ColorBy, PhaseType, PressureDependentVariable } from "@modules/Pvt/typesAndEnums";

export const selectedPhaseAtom = atom<PhaseType>(PhaseType.OIL);
export const selectedColorByAtom = atom<ColorBy>(ColorBy.ENSEMBLE);
export const selectedDependentVariablesAtom = atom<PressureDependentVariable[]>([
    PressureDependentVariable.FORMATION_VOLUME_FACTOR,
    PressureDependentVariable.DENSITY,
    PressureDependentVariable.VISCOSITY,
    PressureDependentVariable.FLUID_RATIO,
]);
