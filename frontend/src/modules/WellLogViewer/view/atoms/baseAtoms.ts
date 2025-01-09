import { WellboreHeader_api } from "@api";

import { atom } from "jotai";

export const wellboreHeaderAtom = atom<WellboreHeader_api | null>(null);
export const selectedFieldIdentAtom = atom<string | null>(null);
