import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { Interface, interfaceInitialization } from "./settingsToViewInterface";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<Interface>(MODULE_NAME, interfaceInitialization);

module.viewFC = View;
module.settingsFC = Settings;
