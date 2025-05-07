import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { ColorBy, VisualizationType } from "@modules/RelPerm/typesAndEnums";

import { atom } from "jotai";
import { isEqual } from "lodash";

function areEnsembleIdentsEqual(a: RegularEnsembleIdent | null, b: RegularEnsembleIdent | null) {
    if (a === null) {
        return b === null;
    }
    return a.equals(b);
}
export const selectedColorByAtom = atom<ColorBy>(ColorBy.ENSEMBLE);
export const selectedVisualizationTypeAtom = atom<VisualizationType>(VisualizationType.STATISTICAL_FANCHART);

export const userSelectedEnsembleIdentAtom = atomWithCompare<RegularEnsembleIdent | null>(null, areEnsembleIdentsEqual);
export const validRealizationNumbersAtom = atom<number[] | null>(null);

export const userSelectedTableNameAtom = atom<string | null>(null);
export const userSelectedSaturationAxisAtom = atom<string | null>(null);
export const userSelectedSatNumsAtom = atomWithCompare<number[]>([], isEqual);
export const userSelectedRelPermCurveNamesAtom = atom<string[] | null>(null);
