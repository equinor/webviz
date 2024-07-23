import { ModuleRegistry } from "@framework/ModuleRegistry";

import { WorkbenchSpySettings, WorkbenchSpyView } from "./implementation";
import { Interfaces, settingsToViewInterfaceInitialization } from "./interfaces";

const module = ModuleRegistry.initModule<Interfaces>("DbgWorkbenchSpy", {
    settingsToViewInterfaceInitialization,
});

module.viewFC = WorkbenchSpyView;
module.settingsFC = WorkbenchSpySettings;
