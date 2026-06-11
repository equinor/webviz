import { atom } from "jotai";

import { RftStatistic } from "../../typesAndEnums";

export const validRealizationNumbersAtom = atom<number[] | null>(null);

export const showIndividualRealizationsAtom = atom<boolean>(false);
export const showStatisticalLinesAtom = atom<boolean>(true);
export const showStatisticalFanAtom = atom<boolean>(true);
export const showObservationsAtom = atom<boolean>(false);
export const selectedStatisticsAtom = atom<RftStatistic[]>([RftStatistic.P50, RftStatistic.MEAN]);
export const dataChannelDepthAtom = atom<number | null>(null);
export const showDepthLineAtom = atom<boolean>(true);
