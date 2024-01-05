import { Wellbore } from "@framework/Wellbore";

import { SeismicAddress, SurfaceAddress } from "./types";

export interface State {
    wellboreAddress: Wellbore | null;
    seismicAddress: SeismicAddress | null;
    surfaceAddress: SurfaceAddress | null;
    extension: number;
    zScale: number;
}
