import { SurfaceMeshLayerSettings, ViewSettings } from "@modules/SubsurfaceMap/_utils";
import { PolygonsAddress } from "@modules/_shared/Polygons";
import { RealizationSurfaceAddress, StatisticalSurfaceAddress } from "@modules/_shared/Surface";

import { atom } from "jotai";

export const meshSurfaceAddressAtom = atom<RealizationSurfaceAddress | StatisticalSurfaceAddress | null>(null);
export const propertySurfaceAddressAtom = atom<RealizationSurfaceAddress | StatisticalSurfaceAddress | null>(null);
export const polygonsAddressAtom = atom<PolygonsAddress | null>(null);
export const selectedWellUuidsAtom = atom<string[]>([]);
export const surfaceSettingsAtom = atom<SurfaceMeshLayerSettings | null>(null);
export const viewSettingsAtom = atom<ViewSettings | null>(null);
