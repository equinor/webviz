import { ModuleRegistry } from "@framework/ModuleRegistry";

import "./atoms";
import { Settings } from "./settings";
import { SettingsToViewInterface, interfaceInitialization } from "./settingsToViewInterface";
import { View } from "./view";

const module = ModuleRegistry.initModule<SettingsToViewInterface>("MyModule2", interfaceInitialization);

module.viewFC = View;
module.settingsFC = Settings;
