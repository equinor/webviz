import { atom } from "jotai";

import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { areEnsembleIdentListsEqual } from "@framework/utils/ensembleIdentUtils";

import { ColorBy, CurveType, GroupBy, RelPermMetric, VisualizationType, YAxisScale } from "../../typesAndEnums";

export const userSelectedEnsembleIdentsAtom = atomWithCompare<RegularEnsembleIdent[]>([], areEnsembleIdentListsEqual);
export const validRealizationNumbersAtom = atom<number[] | null>(null);
export const userSelectedTableNameAtom = atom<string | null>(null);
export const userSelectedSaturationAxisNameAtom = atom<string | null>(null);
export const userSelectedCurveNamesAtom = atom<string[]>([]);
export const userSelectedSatnumsAtom = atom<number[]>([]);

export const selectedCurveTypeAtom = atom<CurveType>(CurveType.RELPERM);
export const selectedVisualizationTypeAtom = atom<VisualizationType>(VisualizationType.STATISTICAL_FANCHART);
export const selectedColorByAtom = atom<ColorBy>(ColorBy.CURVE);
export const selectedGroupByAtom = atom<GroupBy>(GroupBy.NONE);
export const selectedYAxisScaleAtom = atom<YAxisScale>(YAxisScale.LINEAR);
export const selectedMetricAtom = atom<RelPermMetric>(RelPermMetric.MEAN_CURVE_VALUE);
