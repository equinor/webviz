import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: "EChartsDemo",
    defaultTitle: "ECharts Demo",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description: "ECharts demo module",
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});
