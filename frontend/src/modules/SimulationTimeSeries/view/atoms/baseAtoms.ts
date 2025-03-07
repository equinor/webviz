import { Frequency_api } from "@api";
import type { VectorSpec } from "@modules/SimulationTimeSeries/typesAndEnums";
import { VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";

import { atom } from "jotai";

export const userSelectedActiveTimestampUtcMsAtom = atom<number | null>(null);
export const vectorSpecificationsAtom = atom<VectorSpec[]>([]);
export const resampleFrequencyAtom = atom<Frequency_api | null>(Frequency_api.MONTHLY);
export const visualizationModeAtom = atom<VisualizationMode>(VisualizationMode.STATISTICAL_FANCHART);
export const showObservationsAtom = atom<boolean>(true);
