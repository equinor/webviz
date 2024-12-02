import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { ColorBy, PhaseType, PressureDependentVariable } from "@modules/Pvt/typesAndEnums";

import { atom } from "jotai";
import { isEqual } from "lodash";

function areEnsembleIdentListsEqual(a: RegularEnsembleIdent[], b: RegularEnsembleIdent[]) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (!a[i].equals(b[i])) {
            return false;
        }
    }
    return true;
}

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
