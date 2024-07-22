import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SettingsToViewInterface } from "./settingsToViewInterface";

const description = "Plotting of simulated RFT results.";

ModuleRegistry.registerModule<SettingsToViewInterface>({
    moduleName: "Rft",
    defaultTitle: "RFT",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.RFT],
    description,
});
