import { atom } from "jotai";

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);
export const userSelectedUnitWellpicksAtom = atom<string[]>([]);
export const userSelectedNonUnitWellpicksAtom = atom<string[]>([]);
