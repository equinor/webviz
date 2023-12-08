import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { DisplayComponentType, State } from "./state";
import { view } from "./view";

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

module.viewFC = view;
module.settingsFC = settings;
