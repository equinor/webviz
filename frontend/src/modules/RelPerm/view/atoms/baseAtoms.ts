import { ColorBy, CurveType, GroupBy } from "@modules/RelPerm/typesAndEnums";
import type { RelPermSpec, VisualizationSettings } from "@modules/RelPerm/typesAndEnums";

import { atom } from "jotai";

export const relPermSpecificationsAtom = atom<RelPermSpec[]>([]);
export const curveTypeAtom = atom(CurveType.RELPERM);
export const visualizationSettingsAtom = atom<VisualizationSettings>({
    colorBy: ColorBy.ENSEMBLE,
    groupBy: GroupBy.NONE,
    opacity: 0.5,
    lineWidth: 1,
});
