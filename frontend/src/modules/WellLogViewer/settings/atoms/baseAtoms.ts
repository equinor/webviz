import { atom } from "jotai";

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);
export const userSelectedWellLogNameAtom = atom<string | null>(null);
export const userSelectedWellLogCurveNamesAtom = atom<string[]>([]);
