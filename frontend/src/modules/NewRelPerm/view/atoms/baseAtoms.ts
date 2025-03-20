import { atom } from "jotai";

import { ColorBy, RelPermSpec, VisualizationMode } from "../..//typesAndEnums";

export const relPermSpecificationsAtom = atom<RelPermSpec[]>([]);
export const selectedColorByAtom = atom<ColorBy>(ColorBy.ENSEMBLE);
export const selectedVisualizationModeAtom = atom<VisualizationMode>(VisualizationMode.STATISTICAL_FANCHART);
