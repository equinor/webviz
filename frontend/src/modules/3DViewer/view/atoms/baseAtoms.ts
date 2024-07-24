import { IntersectionType } from "@framework/types/intersection";

import { atom } from "jotai";

export const intersectionTypeAtom = atom<IntersectionType>(IntersectionType.WELLBORE);
export const editCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);
