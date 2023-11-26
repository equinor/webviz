import { ModuleRegistry } from "@framework/ModuleRegistry";
import { Frequency_api} from "@api";

import { settings } from "./settings";
import { State, StatisticsOrRealization } from "./state";
import { view } from "./view";

const initialState: State = {
    ensembleIdent: null,
    statOrReal: StatisticsOrRealization.Realization,
    realization: 0,
    resamplingFrequency: Frequency_api.YEARLY,
};

const module = ModuleRegistry.initModule<State>("GroupTree", initialState);

module.viewFC = view;
module.settingsFC = settings;