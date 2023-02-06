import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

const initialState: State = {
    count: 0,
};

ModuleRegistry.registerModule<State>("MyModule", initialState);
