import { atom } from "jotai";

import type { UnlinkedViewState } from "@modules/Intersection/typesAndEnums";

import type { ViewLink } from "../components/ViewLinkManager";

export const viewLinksAtom = atom<ViewLink[] | null>(null);
export const unlinkedViewStateMapAtom = atom<Record<string, UnlinkedViewState> | null>(null);
