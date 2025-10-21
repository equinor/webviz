import { atom } from "jotai";

import { SensitivitySortBy } from "@modules/_shared/SensitivityProcessing/types";
import type { SelectedSensitivity } from "@modules/SensitivityPlot/typesAndEnums";
import { DisplayComponentType, SensitivityScaling } from "@modules/SensitivityPlot/typesAndEnums";
import { ColorBy } from "@modules/SensitivityPlot/view/components/sensitivityChartFigure";

export const displayComponentTypeAtom = atom<DisplayComponentType>(DisplayComponentType.SENSITIVITY_CHART);
export const referenceSensitivityNameAtom = atom<string | null>(null);
export const sensitivityNamesAtom = atom<string[]>([]);
export const responseChannelNameAtom = atom<string | null>(null);
export const hideZeroYAtom = atom<boolean>(false);
export const showLabelsAtom = atom<boolean>(true);
export const showRealizationPointsAtom = atom<boolean>(false);
export const selectedSensitivityAtom = atom<SelectedSensitivity | null>(null);
export const sensitivitySortByAtom = atom<SensitivitySortBy>(SensitivitySortBy.IMPACT);
export const sensitivityScalingAtom = atom<SensitivityScaling>(SensitivityScaling.RELATIVE);
export const colorByAtom = atom<ColorBy>(ColorBy.LOW_HIGH);
