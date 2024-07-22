import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
import { SettingsToViewInterface } from "./settingsToViewInterface";

const description = "Plotting of in-place volumetric distributions.";

ModuleRegistry.registerModule<SettingsToViewInterface>({
    moduleName: "InplaceVolumetrics",
    defaultTitle: "Inplace volumetrics",
    channelDefinitions: channelDefs,
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    dataTagIds: [ModuleDataTagId.INPLACE_VOLUMETRICS],
    description,
});
