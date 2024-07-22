import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { SettingsToViewInterface, interfaceInitialization } from "./settingsToViewInterface";
import { View } from "./view";

const module = ModuleRegistry.initModule<SettingsToViewInterface>("SeismicIntersection", interfaceInitialization);

module.viewFC = View;
module.settingsFC = Settings;
