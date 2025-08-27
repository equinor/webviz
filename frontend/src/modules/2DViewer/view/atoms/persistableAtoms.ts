import type { ViewStateType } from "@webviz/subsurface-viewer";
import { atom } from "jotai";

export const viewStateAtom = atom<ViewStateType | null>(null);
