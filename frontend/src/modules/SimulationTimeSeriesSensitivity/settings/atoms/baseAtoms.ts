import { Frequency_api } from "@api";
import { VectorSpec } from "@modules/SimulationTimeSeriesSensitivity/typesAndEnums";

import { atom } from "jotai";

export const vectorSpecAtom = atom<VectorSpec | null>(null);
export const resamplingFrequencyAtom = atom<Frequency_api | null>(Frequency_api.MONTHLY);
export const selectedSensitivitiesAtom = atom<string[] | null>(null);
export const showStatisticsAtom = atom<boolean>(true);
export const showRealizationsAtom = atom<boolean>(false);
export const realizationsToIncludeAtom = atom<number[] | null>(null);
export const showHistoricalAtom = atom<boolean>(true);
