import { PolygonsAddress } from "@modules/_shared/Polygons/polygonsAddress";
import { RealSurfAddr, StatSurfAddr } from "@modules/_shared/Surface";

import { SurfaceMeshLayerSettings, ViewSettings } from "./_utils";

export interface state {
    meshSurfaceAddress: RealSurfAddr | StatSurfAddr | null;
    propertySurfaceAddress: RealSurfAddr | StatSurfAddr | null;
    polygonsAddress: PolygonsAddress | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings | null;
    viewSettings: ViewSettings | null;
}
