import { atom } from "jotai";

import { PlotType } from "../../typesAndEnums";

export const plotTypeAtom = atom<PlotType | null>(PlotType.ParameterResponseCrossPlot);
export const parameterIdentStringAtom = atom<string | null>(null);
export const showTrendlineAtom = atom<boolean>(true);
