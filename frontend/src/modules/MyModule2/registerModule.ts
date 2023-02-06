import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

const initialState: State = {
    text: "Hello World",
};

ModuleRegistry.registerModule<State>("MyModule2", initialState);
