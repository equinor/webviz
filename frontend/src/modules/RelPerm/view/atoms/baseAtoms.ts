import { ColorBy, GroupBy } from "@modules/RelPerm/typesAndEnums";
import type { VisualizationSettings } from "@modules/RelPerm/typesAndEnums";
import type { RelPermSpec } from "@modules/RelPerm/typesAndEnums";

import { atom } from "jotai";

export const relPermSpecificationsAtom = atom<RelPermSpec[]>([]);
export const visualizationSettingsAtom = atom<VisualizationSettings>({
    colorBy: ColorBy.ENSEMBLE,
    groupBy: GroupBy.NONE,
    opacity: 0.5,
    lineWidth: 1,
});
