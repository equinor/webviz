import { atom } from "jotai";

import { SensitivitySortOrder } from "@modules/_shared/SensitivityProcessing/types";
import type { SelectedSensitivity } from "@modules/TornadoChart/typesAndEnums";
import { DisplayComponentType, XAxisBarScaling } from "@modules/TornadoChart/typesAndEnums";

export const displayComponentTypeAtom = atom<DisplayComponentType>(DisplayComponentType.TornadoChart);
export const referenceSensitivityNameAtom = atom<string | null>(null);
export const sensitivityNamesAtom = atom<string[]>([]);
export const responseChannelNameAtom = atom<string | null>(null);
export const hideZeroYAtom = atom<boolean>(false);
export const showLabelsAtom = atom<boolean>(true);
export const showRealizationPointsAtom = atom<boolean>(false);
export const selectedSensitivityAtom = atom<SelectedSensitivity | null>(null);
export const barSortOrderAtom = atom<SensitivitySortOrder>(SensitivitySortOrder.IMPACT);
export const xAxisBarScalingAtom = atom<XAxisBarScaling>(XAxisBarScaling.RELATIVE);
