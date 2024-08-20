import { Wellbore } from "@framework/types/wellbore";
import { SeismicAddress, SurfaceAddress, WellborePickSelectionType } from "@modules/SeismicIntersection/typesAndEnums";

import { atom } from "jotai";

export const wellboreAddressAtom = atom<Wellbore | null>(null);
export const seismicAddressAtom = atom<SeismicAddress | null>(null);
export const surfaceAddressAtom = atom<SurfaceAddress | null>(null);
export const wellborePickCaseUuidAtom = atom<string | null>(null);
export const wellborePickSelectionAtom = atom<WellborePickSelectionType>(WellborePickSelectionType.NONE);
export const extensionAtom = atom<number>(1000);
export const zScaleAtom = atom<number>(5);
