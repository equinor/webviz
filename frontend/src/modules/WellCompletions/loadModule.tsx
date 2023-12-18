import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { DataLoadingStatus, State } from "./state";
import { View } from "./view";

const initialState: State = {
    dataLoadingStatus: DataLoadingStatus.Idle,
    availableTimeSteps: null,
    plotData: null,
};

const module = ModuleRegistry.initModule<State>("WellCompletions", initialState);

module.viewFC = View;
module.settingsFC = Settings;
