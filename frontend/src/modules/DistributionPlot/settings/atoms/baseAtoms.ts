import { atom } from "jotai";

import { PlotType } from "@modules/DistributionPlot/typesAndEnums";


export const plotTypeAtom = atom<PlotType | null>(PlotType.Histogram);
export const numBinsAtom = atom<number>(10);
export const orientationAtom = atom<"h" | "v">("h");
