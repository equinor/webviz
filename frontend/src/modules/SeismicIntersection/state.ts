import { Wellbore } from "@framework/Wellbore";

import { SeismicAddress } from "./types";

export interface State {
    wellBoreAddress: Wellbore | null;
    seismicAddress: SeismicAddress | null;
}
