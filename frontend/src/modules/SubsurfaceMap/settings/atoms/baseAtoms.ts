import { atom } from "jotai";

import type { PolygonsAddress } from "@modules/_shared/Polygons";
import type { RealizationSurfaceAddress, StatisticalSurfaceAddress } from "@modules/_shared/Surface";
import type { SurfaceMeshLayerSettings, ViewSettings } from "@modules/SubsurfaceMap/_utils";


export const meshSurfaceAddressAtom = atom<RealizationSurfaceAddress | StatisticalSurfaceAddress | null>(null);
export const propertySurfaceAddressAtom = atom<RealizationSurfaceAddress | StatisticalSurfaceAddress | null>(null);
export const polygonsAddressAtom = atom<PolygonsAddress | null>(null);
export const selectedWellUuidsAtom = atom<string[]>([]);
export const surfaceSettingsAtom = atom<SurfaceMeshLayerSettings | null>(null);
export const viewSettingsAtom = atom<ViewSettings | null>(null);
