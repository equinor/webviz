import { atom } from "jotai";

import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { KeyKind, ChannelReceiverReturnData } from "@framework/types/dataChannnel";
import { PlotType } from "@modules/ParameterResponseCorrelationMatrixPlot/typesAndEnums";

export const receivedChannelAtom = atom<ChannelReceiverReturnData<KeyKind.REALIZATION[]>[]>([]);
export const selectedParameterIdentsAtom = atom<ParameterIdent[]>([]);

export const regularEnsembleIdentsAtom = atom<RegularEnsembleIdent[]>([]);

export const showLabelsAtom = atom<boolean>(false);
export const useFixedColorRangeAtom = atom<boolean>(true);
export const plotTypeAtom = atom<PlotType>(PlotType.FullTriangularMatrix);
export const correlationThresholdAtom = atom<number>(0.1);
export const hideIndividualCellsAtom = atom<boolean>(true);
export const filterColumnsAtom = atom<boolean>(true);
export const filterRowsAtom = atom<boolean>(true);
