import { atom } from "jotai";

import type { ViewStateMap } from "@modules/Intersection/typesAndEnums";

import type { ViewLink } from "../components/ViewLinkManager";

export const viewLinksAtom = atom<ViewLink[] | null>(null);
export const viewStateMapAtom = atom<ViewStateMap | null>(null);
