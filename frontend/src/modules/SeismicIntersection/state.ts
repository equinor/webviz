import { Wellbore } from "@framework/Wellbore";

import { SeismicAddress } from "./types";

export interface State {
    wellboreAddress: Wellbore | null;
    seismicAddress: SeismicAddress | null;
}
