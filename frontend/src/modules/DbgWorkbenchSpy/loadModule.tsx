import { ModuleRegistry } from "@framework/ModuleRegistry";

import { WorkbenchSpySettings, WorkbenchSpyView } from "./implementation";
import { SettingsToViewInterface } from "./settingsToViewInterface";

const module = ModuleRegistry.initModule<SettingsToViewInterface>("DbgWorkbenchSpy");

module.viewFC = WorkbenchSpyView;
module.settingsFC = WorkbenchSpySettings;
