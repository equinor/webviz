import { PlotType } from "@modules/DistributionPlot/typesAndEnums";

import { atom } from "jotai";

export const plotTypeAtom = atom<PlotType | null>(PlotType.Histogram);
export const numBinsAtom = atom<number>(10);
export const orientationAtom = atom<"h" | "v">("h");
