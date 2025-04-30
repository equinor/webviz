import { atom } from "jotai";

import type { SelectedSensitivity } from "@modules/TornadoChart/typesAndEnums";


export const selectedSensitivityAtom = atom<SelectedSensitivity | null>(null);
