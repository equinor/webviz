import type { QcCheckDefinition } from "../QcCheck";

import { HydrostaticEquilibriumCheckSettings } from "./HydrostaticEquilibriumCheckSettings";
import { HydrostaticEquilibriumGridPropertyCheckStep } from "./HydrostaticEquilibriumGridPropertyCheckStep";
import {
    DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS,
    type HydrostaticEquilibriumCheckParams,
} from "./hydrostaticEquilibriumShared";
import { HydrostaticEquilibriumVectorCheckStep } from "./HydrostaticEquilibriumVectorCheckStep";

// The grid property step only runs for realizations that passed the vector step
export const HydrostaticEquilibriumCheck: QcCheckDefinition<HydrostaticEquilibriumCheckParams> = {
    name: "Initial hydrostatic equilibrium",
    defaultParams: DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS,
    settingsComponent: HydrostaticEquilibriumCheckSettings,
    steps: [HydrostaticEquilibriumVectorCheckStep, HydrostaticEquilibriumGridPropertyCheckStep],
};
