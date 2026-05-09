import { atom } from "jotai";

import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { areEnsembleIdentListsEqual } from "@framework/utils/ensembleIdentUtils";

import { ColorBy, CurveType, GroupBy, RelPermMetric, RelPermStatistic, YAxisScale } from "../../typesAndEnums";

export const userSelectedEnsembleIdentsAtom = atomWithCompare<RegularEnsembleIdent[]>([], areEnsembleIdentListsEqual);
export const validRealizationNumbersAtom = atom<number[] | null>(null);
export const userSelectedTableNameAtom = atom<string | null>(null);
export const userSelectedSaturationAxisNameAtom = atom<string | null>(null);
export const userSelectedCurveNamesAtom = atom<string[]>([]);
export const userSelectedSatnumsAtom = atom<number[]>([]);

export const selectedCurveTypeAtom = atom<CurveType>(CurveType.RELPERM);
export const showIndividualRealizationsAtom = atom<boolean>(false);
export const showStatisticalLinesAtom = atom<boolean>(true);
export const showStatisticalFanAtom = atom<boolean>(true);
export const selectedStatisticsAtom = atom<RelPermStatistic[]>([RelPermStatistic.P50, RelPermStatistic.MEAN]);
export const selectedColorByAtom = atom<ColorBy>(ColorBy.CURVE);
export const selectedGroupByAtom = atom<GroupBy>(GroupBy.NONE);
export const selectedYAxisScaleAtom = atom<YAxisScale>(YAxisScale.LINEAR);
export const selectedMetricAtom = atom<RelPermMetric>(RelPermMetric.MEAN_CURVE_VALUE);
