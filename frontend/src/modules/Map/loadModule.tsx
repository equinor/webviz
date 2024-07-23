import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces, settingsToViewInterfaceInitialization } from "./interfaces";
import { MapSettings } from "./settings/settings";
import { MapView } from "./view";

const module = ModuleRegistry.initModule<Interfaces>("Map", { settingsToViewInterfaceInitialization });

module.viewFC = MapView;
module.settingsFC = MapSettings;
