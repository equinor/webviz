import { DataLoadingStatus } from "@modules/WellCompletions/typesAndEnums";
import { PlotData } from "@webviz/well-completions-plot";

import { atom } from "jotai";

export const dataLoadingStatusAtom = atom<DataLoadingStatus>(DataLoadingStatus.Idle);
export const availableTimeStepsAtom = atom<string[] | null>(null);
export const plotDataAtom = atom<PlotData | null>(null);
