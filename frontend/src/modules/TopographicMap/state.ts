import { SurfAddr } from "./SurfaceAddress";
import { SurfacePolygonsAddress } from "./SurfacePolygonsAddress";
import { SurfaceMeshLayerSettings } from "./_utils/";

export interface state {
    meshSurfaceAddress: SurfAddr | null;
    propertySurfaceAddress: SurfAddr | null;
    polygonsAddress: SurfacePolygonsAddress | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings | undefined;
}
