import { SurfAddr } from "./SurfAddr";
import { SurfaceMeshLayerSettings } from "./_utils/";

export interface state {
    surfaceAddress: SurfAddr | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings|undefined;
}
