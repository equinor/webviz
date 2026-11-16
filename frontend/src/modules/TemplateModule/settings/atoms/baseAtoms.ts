import { atom } from "jotai";

import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";


export const typeAtom = atom<ColorScaleType>(ColorScaleType.Discrete);
export const gradientTypeAtom = atom<ColorScaleGradientType>(ColorScaleGradientType.Sequential);
export const minAtom = atom<number>(0);
export const maxAtom = atom<number>(18);
export const divMidPointAtom = atom<number>(9);
