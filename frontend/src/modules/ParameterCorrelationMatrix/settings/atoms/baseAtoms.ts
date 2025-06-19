import { atom } from "jotai";

export const parameterIdentStringsAtom = atom<string[]>([]);
export const showLabelsAtom = atom<boolean>(false);
export const showSelfCorrelationAtom = atom<boolean>(true);
export const useFixedColorRangeAtom = atom<boolean>(true);
