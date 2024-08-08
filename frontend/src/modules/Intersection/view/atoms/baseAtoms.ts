import { IntersectionType } from "@framework/types/intersection";
import { WellboreHeader } from "@modules/Intersection/typesAndEnums";

import { atom } from "jotai";

export const selectedCustomIntersectionPolylineIdAtom = atom<string | null>(null);
export const intersectionTypeAtom = atom<IntersectionType>(IntersectionType.WELLBORE);
export const wellboreHeaderAtom = atom<WellboreHeader | null>(null);
export const intersectionExtensionLengthAtom = atom<number>(1000);
