import { atom } from "jotai";
import { DisplayableData } from "../../types";

export const selectedTableNameAtom = atom<string | null>(null);
export const displayableDataAtom = atom<DisplayableData | null>(null);
