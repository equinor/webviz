import { ModuleRegistry } from "@/core/framework/ModuleRegistry";

export type State = {
    count: number;
};

const initialState: State = {
    count: 0,
};

ModuleRegistry.registerModule<State>("MyModule", initialState);
