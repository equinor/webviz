import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { View } from "./view";

const module = ModuleRegistry.initModule<Record<string, never>>("SimulationTimeSeries", {});

module.viewFC = View;
module.settingsFC = Settings;
