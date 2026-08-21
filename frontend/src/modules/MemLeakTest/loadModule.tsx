import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings/settings";
import { View } from "./view";

const module = ModuleRegistry.initModule("MemLeakTest", {});

module.viewFC = View;
module.settingsFC = Settings;
