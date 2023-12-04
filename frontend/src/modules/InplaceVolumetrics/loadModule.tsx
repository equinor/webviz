import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channelDefs } from "./channelDefs";
import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    ensembleIdent: null,
    tableName: null,
    categoricalOptions: null,
    categoricalFilter: null,
    responseName: null,
    realizationsToInclude: null,
};

const module = ModuleRegistry.initModule<State>("InplaceVolumetrics", defaultState);

module.viewFC = view;
module.settingsFC = settings;
