import { atom } from "jotai";

import { GroupBy, StatisticsType, VisualizationMode } from "@modules/DynamicVolumes/typesAndEnums";

export const visualizationModeAtom = atom<VisualizationMode>(VisualizationMode.StatisticalLines);
export const groupByAtom = atom<GroupBy>(GroupBy.Ensemble);
export const selectedStatisticsAtom = atom<StatisticsType[]>([
    StatisticsType.Mean,
    StatisticsType.P10,
    StatisticsType.P90,
]);
export const showHistogramAtom = atom<boolean>(true);
