import { atom } from "jotai";

import { PlotType } from "../../typesAndEnums";

export const plotTypeAtom = atom<PlotType>(PlotType.ParameterResponseCrossPlot);
export const parameterIdentStringAtom = atom<string | null>(null);
export const showTrendlineAtom = atom<boolean>(true);
