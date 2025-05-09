import { atom } from "jotai";
import { isEqual } from "lodash";

import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { areEnsembleIdentListsEqual } from "@framework/utils/ensembleIdentUtils";
import { ColorBy, PhaseType, PressureDependentVariable } from "@modules/Pvt/typesAndEnums";


export const selectedPhaseAtom = atom<PhaseType>(PhaseType.OIL);
export const selectedColorByAtom = atom<ColorBy>(ColorBy.ENSEMBLE);
export const selectedDependentVariablesAtom = atom<PressureDependentVariable[]>([
    PressureDependentVariable.FORMATION_VOLUME_FACTOR,
    PressureDependentVariable.DENSITY,
    PressureDependentVariable.VISCOSITY,
    PressureDependentVariable.FLUID_RATIO,
]);

export const userSelectedEnsembleIdentsAtom = atomWithCompare<RegularEnsembleIdent[]>([], areEnsembleIdentListsEqual);
export const userSelectedRealizationsAtom = atomWithCompare<number[]>([], isEqual);
export const userSelectedPvtNumsAtom = atomWithCompare<number[]>([], isEqual);
