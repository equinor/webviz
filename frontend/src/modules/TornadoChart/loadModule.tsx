import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { DisplayComponentType, State } from "./state";
import { View } from "./view";

const defaultState: State = {
    displayComponentType: DisplayComponentType.TornadoChart,
    referenceSensitivityName: null,
    sensitivityNames: [],
    selectedSensitivity: null,
    responseChannelName: null,
    hideZeroY: false,
    showLabels: true,
    showRealizationPoints: false,
};

const module = ModuleRegistry.initModule<State>("TornadoChart", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
