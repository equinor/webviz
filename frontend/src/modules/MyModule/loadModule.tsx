import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings/settings";
import { SettingsToViewInterface, interfaceInitialization } from "./settingsToViewInterface";
import { View } from "./view";

const module = ModuleRegistry.initModule<SettingsToViewInterface>("MyModule", interfaceInitialization);

module.viewFC = View;
module.settingsFC = settings;
