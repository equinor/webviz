import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { State, QueryStatus } from "./state";
import { view } from "./view";

const initialState: State = {
    edgeMetadataList: [],
    nodeMetadataList: [],
    datedTrees: [],
    selectedEdgeKey: "",
    selectedNodeKey: "",
    selectedDateTime: "",
    queryStatus: QueryStatus.Idle
};

const module = ModuleRegistry.initModule<State>("GroupTree", initialState);

module.viewFC = view;
module.settingsFC = settings;