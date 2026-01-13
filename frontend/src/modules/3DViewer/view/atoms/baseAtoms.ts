import type { ViewStateType } from "@webviz/subsurface-viewer";
import { atom } from "jotai";

export const viewStateAtom = atom<ViewStateType | null>(null);
export const verticalScaleAtom = atom<number>(10);
