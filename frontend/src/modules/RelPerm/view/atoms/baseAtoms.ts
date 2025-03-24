import { ColorBy, RelPermSpec, VisualizationSettings } from "@modules/RelPerm/typesAndEnums";

import { atom } from "jotai";

export const relPermSpecificationsAtom = atom<RelPermSpec[]>([]);
export const visualizationSettingsAtom = atom<VisualizationSettings>({
    colorBy: ColorBy.ENSEMBLE,
    opacity: 0.5,
    lineWidth: 1,
});
