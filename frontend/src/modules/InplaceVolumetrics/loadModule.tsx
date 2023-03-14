import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const initialState: State = {
    ensembleName: null,
    tableName: null,
    categoricalOptions: null,
    categoricalFilter: null,
    responseName: null,
    realizationsToInclude: null,

};

const module = ModuleRegistry.initModule<State>("InplaceVolumetrics", initialState);

module.viewFC = view;
module.settingsFC = settings;