import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import { Settings } from "./settings/settings";
import { View } from "./view/view";
import { ModuleRegistry } from "@framework/ModuleRegistry";

const module = ModuleRegistry.initModule<Interfaces>("ParameterCorrelationPlot", {
    settingsToViewInterfaceInitialization,
});

module.viewFC = View;
module.settingsFC = Settings;
