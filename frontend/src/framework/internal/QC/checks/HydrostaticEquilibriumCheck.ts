import type { QcCheckDefinition } from "../QcCheck";

import { HydrostaticEquilibriumCheckSettings } from "./HydrostaticEquilibriumCheckSettings";
import { HydrostaticEquilibriumGridPropertyCheckStep } from "./HydrostaticEquilibriumGridPropertyCheckStep";
import { DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS, type HydrostaticEquilibriumCheckParams } from "./hydrostaticEquilibriumShared";
import { HydrostaticEquilibriumVectorCheckStep } from "./HydrostaticEquilibriumVectorCheckStep";

// "Initial Hydrostatic Equilibrium" QC check: two steps run in sequence (never in parallel) -
// vector check first, then grid property check. The grid property step reuses the grid the vector
// step already resolved instead of re-resolving it, via `QcCheckStepRunContext.previousStepResults`.
export const HydrostaticEquilibriumCheck: QcCheckDefinition<HydrostaticEquilibriumCheckParams> = {
    name: "Initial hydrostatic equilibrium",
    defaultParams: DEFAULT_HYDROSTATIC_EQUILIBRIUM_CHECK_PARAMS,
    settingsComponent: HydrostaticEquilibriumCheckSettings,
    steps: [HydrostaticEquilibriumVectorCheckStep, HydrostaticEquilibriumGridPropertyCheckStep],
};
