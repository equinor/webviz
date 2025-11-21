import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { InterfaceTypes } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import type { SerializedState } from "./persistence";
import { serializeStateFunctions } from "./persistence";
import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { settingsToViewInterfaceEffects } from "./view/atoms/interfaceEffects";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<InterfaceTypes, SerializedState>(MODULE_NAME, {
    settingsToViewInterfaceInitialization,
    settingsToViewInterfaceEffects,
    ...serializeStateFunctions,
});

module.viewFC = View;
module.settingsFC = Settings;
