import { atom } from "jotai";

import type { ChannelReceiverReturnData, KeyKind } from "@framework/types/dataChannnel";

import { PlotType } from "../../typesAndEnums";

export const plotTypeAtom = atom<PlotType>(PlotType.ParameterResponseCrossPlot);
export const showTrendlineAtom = atom<boolean>(true);
export const receivedChannelAtom = atom<ChannelReceiverReturnData<KeyKind.REALIZATION[]> | null>(null);
