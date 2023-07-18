import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SharedState, WorkbenchSpySettings, WorkbenchSpyView } from "./implementation";

const defaultState: SharedState = {
    triggeredRefreshCounter: 0,
};

const module = ModuleRegistry.initModule<SharedState>("DbgWorkbenchSpy", defaultState);

module.viewFC = WorkbenchSpyView;
module.settingsFC = WorkbenchSpySettings;
