import { WellboreHeader_api } from "@api";

import { atom } from "jotai";

export const wellboreHeaderAtom = atom<WellboreHeader_api | null>(null);
