import { ModuleRegistry } from "@framework/ModuleRegistry";

import { broadcastChannels } from "./broadcastChannel";
import { State } from "./state";

ModuleRegistry.registerModule<State>("MyModule", [], broadcastChannels);
