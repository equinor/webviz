import { atom } from "jotai";

import type { ViewLink } from "../components/ViewLinkManager";

export const viewLinksAtom = atom<ViewLink[] | null>(null);
