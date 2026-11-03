import { atom } from "jotai";

import { Frequency_api } from "@api";

export const resamplingFrequencyAtom = atom<Frequency_api | null>(Frequency_api.MONTHLY);
export const showStatisticsAtom = atom<boolean>(true);
export const showRealizationsAtom = atom<boolean>(false);
export const showHistoricalAtom = atom<boolean>(true);
export const showTimestampMarkerAtom = atom<boolean>(true);
