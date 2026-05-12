import { atom } from "jotai";

import { ColorBy, CurveType, GroupBy, RelPermStatistic, YAxisScale } from "../../typesAndEnums";

export const validRealizationNumbersAtom = atom<number[] | null>(null);

export const selectedCurveTypeAtom = atom<CurveType>(CurveType.RELPERM);
export const showIndividualRealizationsAtom = atom<boolean>(false);
export const showStatisticalLinesAtom = atom<boolean>(true);
export const showStatisticalFanAtom = atom<boolean>(true);
export const selectedStatisticsAtom = atom<RelPermStatistic[]>([RelPermStatistic.P50, RelPermStatistic.MEAN]);
export const selectedColorByAtom = atom<ColorBy>(ColorBy.CURVE);
export const selectedGroupByAtom = atom<GroupBy>(GroupBy.NONE);
export const selectedYAxisScaleAtom = atom<YAxisScale>(YAxisScale.LINEAR);
