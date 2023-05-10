import { ModuleRegistry } from "@framework/ModuleRegistry";

import { broadcastChannelsDef } from "./broadcastChannel";
import { State } from "./state";

ModuleRegistry.registerModule<State>("InplaceVolumetrics", [], broadcastChannelsDef);
