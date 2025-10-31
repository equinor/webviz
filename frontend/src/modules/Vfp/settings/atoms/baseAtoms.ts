import { atom } from "jotai";

import { PressureOption } from "@modules/Vfp/types";

export const selectedPressureOptionAtom = atom<PressureOption>(PressureOption.BHP);
