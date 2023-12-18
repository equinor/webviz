import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = {
    ensembleIdent: null,
    tableName: null,
    categoricalOptions: null,
    categoricalFilter: null,
    responseName: null,
    realizationsToInclude: null,
};

const module = ModuleRegistry.initModule<State>("InplaceVolumetrics", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
