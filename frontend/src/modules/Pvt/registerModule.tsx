import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";
import { preview } from "./preview";

export const MODULE_NAME = "Pvt";

const description =
    "Visualizes formation volume factor and viscosity data for oil, gas, and water from Eclipse init and include files.";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    defaultTitle: "PVT",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.PVT],
    preview,
    description,
});
