import type { WellboreHeader_api } from "@api";

import { atom } from "jotai";

export const wellboreHeaderAtom = atom<WellboreHeader_api | null>(null);
export const selectedFieldIdentAtom = atom<string | null>(null);

// Local switch to avoid unneccessary queries while applying interface effects.
// See issue #846 (https://github.com/equinor/webviz/issues/846)
export const lockQueriesAtom = atom<boolean>(false);
