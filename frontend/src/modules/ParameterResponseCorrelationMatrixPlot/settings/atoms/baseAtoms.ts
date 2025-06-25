import { atom } from "jotai";

import type { ParameterIdent } from "@framework/EnsembleParameters";

export const parameterIdentsAtom = atom<ParameterIdent[]>([]);
export const showLabelsAtom = atom<boolean>(false);
export const showSelfCorrelationAtom = atom<boolean>(true);
export const useFixedColorRangeAtom = atom<boolean>(true);
