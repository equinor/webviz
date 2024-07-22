import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SettingsToViewInterface } from "./settingsToViewInterface";

ModuleRegistry.registerModule<SettingsToViewInterface>({
    moduleName: "DbgWorkbenchSpy",
    defaultTitle: "Debug Workbench Spy",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
});
