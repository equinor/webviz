import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import { Settings } from "./settings/settings";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interfaces>("ParameterResponseCrossPlot", {
    settingsToViewInterfaceInitialization,
});

module.viewFC = View;
module.settingsFC = Settings;
