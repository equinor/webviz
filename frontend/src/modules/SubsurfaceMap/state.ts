import { PolygonsAddress } from "@modules/_shared/Polygons/polygonsAddress";
import { SurfaceAddress } from "@modules/_shared/Surface";

import { SurfaceMeshLayerSettings, ViewSettings } from "./_utils";

export interface state {
    meshSurfaceAddress: SurfaceAddress | null;
    propertySurfaceAddress: SurfaceAddress | null;
    polygonsAddress: PolygonsAddress | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings | null;
    viewSettings: ViewSettings | null;
}
