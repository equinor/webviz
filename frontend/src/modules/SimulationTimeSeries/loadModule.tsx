import { Frequency } from "@api";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { BroadcastChannelNames, BroadcastChannelTypes } from "./broadcastChannel";
import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    vectorSpec: null,
    resamplingFrequency: Frequency.MONTHLY,
    showStatistics: true,
    realizationsToInclude: null,
};

const module = ModuleRegistry.initModule<State, BroadcastChannelNames, BroadcastChannelTypes>(
    "SimulationTimeSeries",
    initialState
);

module.viewFC = view;
module.settingsFC = settings;
