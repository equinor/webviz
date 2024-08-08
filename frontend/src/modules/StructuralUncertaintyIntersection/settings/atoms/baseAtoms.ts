import { StatisticFunction_api } from "@api";
import { Wellbore } from "@framework/types/wellbore";
import {
    IntersectionSettings,
    SurfaceSetAddress,
    VisualizationMode,
} from "@modules/StructuralUncertaintyIntersection/typesAndEnums";

import { atom } from "jotai";

export const wellboreAddressAtom = atom<Wellbore | null>({ uwi: "55/33-A-4", uuid: "drogon_horizontal", type: "smda" });
export const surfaceSetAddressAtom = atom<SurfaceSetAddress | null>(null);
export const visualizationModeAtom = atom<VisualizationMode>(VisualizationMode.STATISTICAL_LINES);
export const statisticFunctionsAtom = atom<StatisticFunction_api[]>([StatisticFunction_api.MEAN]);
export const stratigraphyColorMapAtom = atom<{ [name: string]: string }>({});
export const intersectionSettingsAtom = atom<IntersectionSettings>({ extension: 1000, zScale: 5 });
