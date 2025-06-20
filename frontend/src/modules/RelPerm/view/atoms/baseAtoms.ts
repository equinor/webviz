import { atom } from "jotai";

import { ColorBy, CurveType, GroupBy, VisualizationType } from "@modules/RelPerm/typesAndEnums";
import type { RelPermSpec, VisualizationSettings } from "@modules/RelPerm/typesAndEnums";


export const relPermSpecificationsAtom = atom<RelPermSpec[]>([]);
export const curveTypeAtom = atom(CurveType.RELPERM);
export const visualizationSettingsAtom = atom<VisualizationSettings>({
    colorBy: ColorBy.ENSEMBLE,
    groupBy: GroupBy.NONE,

});
export const visualizationTypeAtom = atom<VisualizationType>(VisualizationType.STATISTICAL_FANCHART);
