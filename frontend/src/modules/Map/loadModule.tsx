import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MapSettings } from "./settings/settings";
import { SettingsToViewInterface, interfaceInitialization } from "./settingsToViewInterface";
import { MapView } from "./view";

const module = ModuleRegistry.initModule<SettingsToViewInterface>("Map", interfaceInitialization);

module.viewFC = MapView;
module.settingsFC = MapSettings;
