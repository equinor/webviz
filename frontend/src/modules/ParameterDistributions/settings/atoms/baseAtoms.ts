import { atom } from "jotai";

import {
    HistogramMode,
    ParameterDistributionPlotType,
    EnsembleMode,
} from "@modules/ParameterDistributions/typesAndEnums";

export const selectedEnsembleModeAtom = atom<EnsembleMode>(EnsembleMode.INDEPENDENT);
export const selectedVisualizationTypeAtom = atom<ParameterDistributionPlotType>(
    ParameterDistributionPlotType.HISTOGRAM,
);
export const showIndividualRealizationValuesAtom = atom<boolean>(false);
export const showPercentilesAndMeanLinesAtom = atom<boolean>(false);

export const showConstantParametersAtom = atom<boolean>(false);
export const showLogParametersAtom = atom<boolean>(false);
export const histogramModeAtom = atom<HistogramMode>(HistogramMode.OVERLAY);
