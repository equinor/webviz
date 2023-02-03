import { ModuleRegistry } from "@/core/framework/ModuleRegistry";

export type State = {
    text: string;
};

const initialState: State = {
    text: "Hello World",
};

ModuleRegistry.registerModule<State>("MyModule2", initialState);
