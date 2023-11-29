import { Wellbore } from "@framework/Wellbore";

import { IntersectionSettings, RealizationsSurfaceSetSpec, StatisticalSurfaceSetSpec } from "./types";

export interface State {
    wellboreAddress: Wellbore | null;
    realizationsSurfaceSetSpec: RealizationsSurfaceSetSpec | null;
    statisticalSurfaceSetSpec: StatisticalSurfaceSetSpec | null;
    intersectionSettings: IntersectionSettings;
}
