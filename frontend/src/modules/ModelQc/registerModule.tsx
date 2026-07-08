import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";
import { preview } from "./preview";

export const MODULE_NAME = "ModelQc";

const description =
    "Quality control of an entire ensemble. Runs a set of automated checks (starting with the Initial " +
    "Hydrostatic Equilibrium check) and presents per-realization pass/fail verdicts with drill-down.";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Model QC",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    preview,
    description,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});
