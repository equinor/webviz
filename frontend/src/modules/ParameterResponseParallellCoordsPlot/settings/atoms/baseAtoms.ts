import { atom } from "jotai";

import { PlotType } from "@modules/ParameterCorrelationPlot/typesAndEnums";

export const plotTypeAtom = atom<PlotType | null>(PlotType.ParameterCorrelation);
export const numParamsAtom = atom<number>(20);
export const corrCutOffAtom = atom<number>(0.0);
export const showLabelsAtom = atom<boolean>(false);
