import { IntersectionType } from "@framework/types/intersection";
import { atomWithTimestamp } from "@framework/utils/atomUtils";

import { atom } from "jotai";

export const intersectionTypeAtom = atomWithTimestamp<IntersectionType>(IntersectionType.WELLBORE);
export const editCustomIntersectionPolylineEditModeActiveAtom = atom<boolean>(false);
