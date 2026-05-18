import { atom } from "jotai";

import type { ViewStateMap } from "@modules/Intersection/typesAndEnums";

import type { ViewLink } from "../typesAndEnums";

export const viewLinksAtom = atom<ViewLink[] | null>(null);
export const viewStateMapAtom = atom<ViewStateMap | null>(null);
