import { Wellbore } from "@framework/Wellbore";

import { GridParameterAddress } from "./GridParameterAddress";
import { SeismicAddress } from "./SeismicAddress";
import { SurfAddr } from "./SurfaceAddress";
import { IntersectionViewSettings } from "./view";

export interface state {
    wellBoreAddress: Wellbore | null;
    seismicAddress: SeismicAddress | null;
    surfaceAddress: SurfAddr | null;
    gridParameterAddress: GridParameterAddress | null;
    viewSettings: IntersectionViewSettings;
}
