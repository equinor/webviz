import { PolygonsAddress } from "@modules/_shared/Polygons/polygonsAddress";
import { RealizationSurfaceAddress, StatisticalSurfaceAddress } from "@modules/_shared/Surface";

import { SurfaceMeshLayerSettings, ViewSettings } from "./_utils";

export interface state {
    meshSurfaceAddress: RealizationSurfaceAddress | StatisticalSurfaceAddress | null;
    propertySurfaceAddress: RealizationSurfaceAddress | StatisticalSurfaceAddress | null;
    polygonsAddress: PolygonsAddress | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings | null;
    viewSettings: ViewSettings | null;
}
