import { Frequency_api } from "@api";
import { Ensemble } from "@framework/Ensemble";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { VectorSpec, VisualizationMode } from "@modules/SimulationTimeSeries/typesAndEnums";

import { atom } from "jotai";

export const userSelectedActiveTimestampUtcMsAtom = atom<number | null>(null);
export const vectorSpecificationsAtom = atom<VectorSpec[]>([]);
export const resampleFrequencyAtom = atom<Frequency_api | null>(null);
export const visualizationModeAtom = atom<VisualizationMode>(VisualizationMode.STATISTICAL_FANCHART);
export const showObservationsAtom = atom<boolean>(true);
export const interfaceColorByParameterAtom = atom<boolean>(false);
export const parameterIdentAtom = atom<ParameterIdent | null>(null);
export const selectedEnsemblesAtom = atom<Ensemble[]>([]);
