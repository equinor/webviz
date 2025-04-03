import { IntersectionType } from "@framework/types/intersection";
import type { ColorScale } from "@lib/utils/ColorScale";

import { atom } from "jotai";

export const addCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);
export const editCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);

export const currentCustomIntersectionPolylineAtom = atom<number[][]>([]);

export const showGridlinesAtom = atom<boolean>(false);
export const gridLayerAtom = atom<number>(1);
export const zFactorAtom = atom<number>(1);
export const intersectionExtensionLengthAtom = atom<number>(1000);
export const intersectionTypeAtom = atom<IntersectionType>(IntersectionType.WELLBORE);
export const seismicColorScaleAtom = atom<ColorScale | null>(null);
export const showSeismicAtom = atom<boolean>(false);

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);
export const userSelectedCustomIntersectionPolylineIdAtom = atom<string | null>(null);
