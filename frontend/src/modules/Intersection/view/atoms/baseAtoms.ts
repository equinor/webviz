import { atom } from "jotai";

import type { StandaloneViewportInfo, ViewLink } from "../components/ViewLinkManager";

export const viewLinksAtom = atom<ViewLink[] | null>(null);
export const viewportMapAtom = atom<Record<string, StandaloneViewportInfo> | null>(null);
