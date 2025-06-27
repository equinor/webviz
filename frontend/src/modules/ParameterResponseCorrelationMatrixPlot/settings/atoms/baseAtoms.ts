import { atom } from "jotai";

import type { ParameterIdent } from "@framework/EnsembleParameters";

import { PlotType, type CorrelationSettings } from "../../typesAndEnums";

export const parameterIdentsAtom = atom<ParameterIdent[]>([]);
export const showLabelsAtom = atom<boolean>(false);
export const useFixedColorRangeAtom = atom<boolean>(true);
export const plotTypeAtom = atom<PlotType>(PlotType.ParameterResponseMatrix);

export const correlationSettingsAtom = atom<CorrelationSettings>({
    threshold: null as number | null,
    hideIndividualCells: true,
    filterColumns: true,
    filterRows: true,
});
