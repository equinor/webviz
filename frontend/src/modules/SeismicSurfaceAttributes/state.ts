import { StaticSurface } from "./StaticSurfaceSelector";
import { SeismicCube } from "./SeismicCubeSelector";

export interface state {
    selectedSurface: StaticSurface | null;
    selectedSeismicCube: SeismicCube|null;
    show3D: boolean;
}
