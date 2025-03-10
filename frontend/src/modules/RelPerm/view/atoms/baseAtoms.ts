import { ColorBy, RelPermSpec, VisualizationType } from "@modules/RelPerm/typesAndEnums";

import { atom } from "jotai";

export const relPermSpecificationsAtom = atom<RelPermSpec[]>([]);
export const selectedColorByAtom = atom<ColorBy>(ColorBy.ENSEMBLE);
export const selectedVisualizationTypeAtom = atom<VisualizationType>(VisualizationType.STATISTICAL_FANCHART);
