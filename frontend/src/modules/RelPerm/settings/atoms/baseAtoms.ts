import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { areEnsembleIdentListsEqual } from "@framework/utils/ensembleIdentUtils";
import { ColorBy, CurveType } from "@modules/RelPerm/typesAndEnums";

import { atom } from "jotai";
import { isEqual } from "lodash";

export const selectedColorByAtom = atom<ColorBy>(ColorBy.ENSEMBLE);
export const selectedOpacityAtom = atom<number>(0.5);
export const selectedLineWidthAtom = atom<number>(1);
export const selectedCurveTypeAtom = atom<CurveType>(CurveType.RELPERM);
export const userSelectedEnsembleIdentsAtom = atomWithCompare<RegularEnsembleIdent[]>([], areEnsembleIdentListsEqual);

export const validRealizationNumbersAtom = atom<number[] | null>(null);

export const userSelectedTableNameAtom = atom<string | null>(null);
export const userSelectedSaturationAxisAtom = atom<string | null>(null);
export const userSelectedSatNumsAtom = atomWithCompare<number[]>([], isEqual);
export const userSelectedRelPermCurveNamesAtom = atom<string[] | null>(null);
