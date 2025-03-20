import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";

import { atom } from "jotai";
import { isEqual } from "lodash";

import { ColorBy, VisualizationMode } from "../../typesAndEnums";

function areEnsembleIdentsEqual(a: RegularEnsembleIdent | null, b: RegularEnsembleIdent | null) {
    if (a === null) {
        return b === null;
    }
    return a.equals(b);
}
export const selectedColorByAtom = atom<ColorBy>(ColorBy.ENSEMBLE);
export const selectedVisualizationModeAtom = atom<VisualizationMode>(VisualizationMode.STATISTICAL_FANCHART);

export const userSelectedEnsembleIdentAtom = atomWithCompare<RegularEnsembleIdent | null>(null, areEnsembleIdentsEqual);
export const validRealizationNumbersAtom = atom<number[] | null>(null);

export const userSelectedTableNameAtom = atom<string | null>(null);
export const userSelectedSaturationAxisAtom = atom<string | null>(null);
export const userSelectedSatNumsAtom = atomWithCompare<number[]>([], isEqual);
export const userSelectedRelPermCurveNamesAtom = atom<string[] | null>(null);
