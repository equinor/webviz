import { atom } from "jotai";

import type { WellboreHeader_api } from "@api";

export const wellboreHeaderAtom = atom<WellboreHeader_api | null>(null);
export const selectedFieldIdentAtom = atom<string | null>(null);
