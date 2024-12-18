import { Frequency_api } from "@api";
import { VectorSpec } from "@modules/SimulationTimeSeriesSensitivity/typesAndEnums";

import { atom } from "jotai";

export const vectorSpecificationAtom = atom<VectorSpec | null>(null);
export const resamplingFrequencyAtom = atom<Frequency_api | null>(Frequency_api.MONTHLY);
export const selectedSensitivityNamesAtom = atom<string[] | null>(null);
export const showStatisticsAtom = atom<boolean>(true);
export const showRealizationsAtom = atom<boolean>(false);
export const showHistoricalAtom = atom<boolean>(true);

export const userSelectedActiveTimestampUtcMsAtom = atom<number | null>(null);
