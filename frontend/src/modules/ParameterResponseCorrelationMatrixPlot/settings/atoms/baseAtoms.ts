import { atom } from "jotai";

import type { KeyKind } from "@framework/DataChannelTypes";
import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { ChannelReceiverReturnData } from "@framework/internal/DataChannels/hooks/useChannelReceiver";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

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
