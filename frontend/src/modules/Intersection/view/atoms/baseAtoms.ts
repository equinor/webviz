import { atom } from "jotai";

import type { ViewLink, ViewStateMap } from "@modules/Intersection/view/typesAndEnums";

export const viewLinksAtom = atom<ViewLink[] | null>(null);
export const viewStateMapAtom = atom<ViewStateMap | null>(null);
