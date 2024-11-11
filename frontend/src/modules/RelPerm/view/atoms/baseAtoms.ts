import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { ColorBy, VisualizationType } from "@modules/RelPerm/typesAndEnums";

import { atom } from "jotai";
import { isEqual } from "lodash";

function areEnsembleIdentsEqual(a: EnsembleIdent | null, b: EnsembleIdent | null) {
    if (a === null) {
        return b === null;
    }
    return a.equals(b);
}

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>(null);
export const selectedRealizationNumbersAtom = atom<number[] | null>(null);
export const selectedTableNameAtom = atom<string | null>(null);
export const selectedSaturationAxisAtom = atom<string | null>(null);
export const selectedSatNumsAtom = atomWithCompare<number[]>([], isEqual);
export const selectedRelPermCurveNamesAtom = atom<string[] | null>(null);
export const selectedColorByAtom = atom<ColorBy>(ColorBy.ENSEMBLE);
export const selectedVisualizationTypeAtom = atom<VisualizationType>(VisualizationType.STATISTICAL_FANCHART);
