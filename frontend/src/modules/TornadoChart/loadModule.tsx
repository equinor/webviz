import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { PlotType, State } from "./state";
import { View } from "./view";

const defaultState: State = {
    plotType: PlotType.TORNADO,
    referenceSensitivityName: null,
    sensitivityNames: [],
    selectedSensitivity: null,
    responseChannelName: null,
};

const module = ModuleRegistry.initModule<State>("TornadoChart", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
