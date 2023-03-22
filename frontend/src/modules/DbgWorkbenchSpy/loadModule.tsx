import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SharedState, WorkbenchSpySettings, WorkbenchSpyView } from "./implementation";

const initialState: SharedState = {
    triggeredRefreshCounter: 0,
};

const module = ModuleRegistry.initModule<SharedState>("DbgWorkbenchSpy", initialState);

module.viewFC = WorkbenchSpyView;
module.settingsFC = WorkbenchSpySettings;
