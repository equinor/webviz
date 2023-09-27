import { SurfaceAddress } from "@modules/_shared/Surface";

import { SurfacePolygonsAddress } from "./SurfacePolygonsAddress";
import { SurfaceMeshLayerSettings, ViewSettings } from "./_utils";

export interface state {
    meshSurfaceAddress: SurfaceAddress | null;
    propertySurfaceAddress: SurfaceAddress | null;
    polygonsAddress: SurfacePolygonsAddress | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings | null;
    viewSettings: ViewSettings | null;
}
