import { PolygonsAddress } from "@modules/_shared/Polygons/polygonsAddress";
import { SurfaceAddress } from "@modules/_shared/Surface";

export type SurfaceMeshLayerSettings = {
    contours?: boolean | number[];
    gridLines?: boolean;
    smoothShading?: boolean;
    material?: boolean;
};

export type ViewSettings = {
    show3d: boolean;
};

export interface state {
    meshSurfaceAddress: SurfaceAddress | null;
    propertySurfaceAddress: SurfaceAddress | null;
    polygonsAddress: PolygonsAddress | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings | null;
    viewSettings: ViewSettings | null;
}
