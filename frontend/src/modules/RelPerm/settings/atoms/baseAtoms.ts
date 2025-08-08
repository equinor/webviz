import { atom } from "jotai";
import { isEqual } from "lodash";

import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { areEnsembleIdentListsEqual } from "@framework/utils/ensembleIdentUtils";
import { ColorBy, CurveType, GroupBy, VisualizationType } from "@modules/RelPerm/typesAndEnums";


export const selectedColorByAtom = atom<ColorBy>(ColorBy.ENSEMBLE);
export const selectedGroupByAtom = atom<GroupBy>(GroupBy.NONE);
export const selectedCurveTypeAtom = atom<CurveType>(CurveType.RELPERM);
export const selectedVisualizationTypeAtom = atom<VisualizationType>(VisualizationType.STATISTICAL_FANCHART);
export const userSelectedEnsembleIdentsAtom = atomWithCompare<RegularEnsembleIdent[]>([], areEnsembleIdentListsEqual);

export const validRealizationNumbersAtom = atom<number[] | null>(null);

export const userSelectedTableNameAtom = atom<string | null>(null);
export const userSelectedSaturationAxisAtom = atom<string | null>(null);
export const userSelectedSatNumsAtom = atomWithCompare<number[]>([], isEqual);
export const userSelectedRelPermCurveNamesAtom = atom<string[] | null>(null);
