import { Wellbore } from "@framework/Wellbore";
// import { GridParameterAddress } from "./GridParameterAddress";
// import { SeismicAddress } from "./SeismicAddress";
import { SurfaceAddress } from "@modules/_shared/Surface";

import { IntersectionViewSettings } from "./view";

export interface state {
    wellBoreAddress: Wellbore | null;
    // seismicAddress: SeismicAddress | null;
    surfaceAddress: SurfaceAddress | null;
    // gridParameterAddress: GridParameterAddress | null;
    viewSettings: IntersectionViewSettings;
}
