import { atom } from "jotai";

import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { TimestampInfoForView } from "../../typesAndEnums";

export const ensembleIdentsAtom = atom<RegularEnsembleIdent[]>([]);
export const isEnsembleSelectionValidAtom = atom<boolean>(false);
export const wellNameAtom = atom<string | null>(null);
export const isWellNameValidAtom = atom<boolean>(false);
export const responseNameAtom = atom<string | null>(null);
export const isResponseNameValidAtom = atom<boolean>(false);
export const timestampAtom = atom<TimestampInfoForView>({ value: null, isValidInContext: false });
export const validRealizationNumbersAtom = atom<number[]>([]);
