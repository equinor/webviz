import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { SettingsToViewInterface } from "./settingsToViewInterface";
import { View } from "./view";

const module = ModuleRegistry.initModule<SettingsToViewInterface>("DistributionPlot");

module.viewFC = View;
module.settingsFC = Settings;
