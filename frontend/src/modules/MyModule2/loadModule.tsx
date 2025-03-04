import { ModuleRegistry } from "@framework/ModuleRegistry";

import "./atoms";
import type { Interfaces} from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import { Settings } from "./settings";
import { View } from "./view";

const module = ModuleRegistry.initModule<Interfaces>("MyModule2", { settingsToViewInterfaceInitialization });

module.viewFC = View;
module.settingsFC = Settings;
