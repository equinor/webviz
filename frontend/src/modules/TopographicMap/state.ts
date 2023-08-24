import { SurfAddr } from "./SurfaceAddress";
import { SurfacePolygonsAddress } from "./SurfacePolygonsAddress";
import { SurfaceMeshLayerSettings, ViewSettings } from "./_utils/";

export interface state {
    meshSurfaceAddress: SurfAddr | null;
    propertySurfaceAddress: SurfAddr | null;
    polygonsAddress: SurfacePolygonsAddress | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings | null;
    viewSettings: ViewSettings | null;
}
