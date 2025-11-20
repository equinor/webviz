import { atom } from "jotai";

import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { KeyKind, ChannelReceiverReturnData } from "@framework/types/dataChannnel";

import { PlotType, type CorrelationSettings } from "../../typesAndEnums";
export const receivedChannelAtom = atom<ChannelReceiverReturnData<KeyKind.REALIZATION[]>[]>([]);
export const selectedParameterIdentsAtom = atom<ParameterIdent[]>([]);
export const showLabelsAtom = atom<boolean>(false);
export const useFixedColorRangeAtom = atom<boolean>(true);
export const plotTypeAtom = atom<PlotType>(PlotType.FullTriangularMatrix);
export const regularEnsembleIdentsAtom = atom<RegularEnsembleIdent[]>([]);
export const correlationSettingsAtom = atom<CorrelationSettings>({
    threshold: null,
    hideIndividualCells: true,
    filterColumns: true,
    filterRows: true,
});
