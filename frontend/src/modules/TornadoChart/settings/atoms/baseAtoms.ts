import { atom } from "jotai";

import type { SelectedSensitivity } from "@modules/TornadoChart/typesAndEnums";
import { DisplayComponentType } from "@modules/TornadoChart/typesAndEnums";


export const displayComponentTypeAtom = atom<DisplayComponentType>(DisplayComponentType.TornadoChart);
export const referenceSensitivityNameAtom = atom<string | null>(null);
export const sensitivityNamesAtom = atom<string[]>([]);
export const responseChannelNameAtom = atom<string | null>(null);
export const hideZeroYAtom = atom<boolean>(false);
export const showLabelsAtom = atom<boolean>(true);
export const showRealizationPointsAtom = atom<boolean>(false);
export const selectedSensitivityAtom = atom<SelectedSensitivity | null>(null);
