import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings/settings";
import { SettingsToViewInterface, interfaceInitialization } from "./settingsToViewInterface";
import { View } from "./view";

const module = ModuleRegistry.initModule<SettingsToViewInterface>("InplaceVolumetrics", interfaceInitialization);

module.viewFC = View;
module.settingsFC = Settings;
