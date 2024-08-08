import { SelectedSensitivity } from "@modules/TornadoChart/typesAndEnums";

import { atom } from "jotai";

export const selectedSensitivityAtom = atom<SelectedSensitivity | null>(null);
