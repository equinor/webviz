import { ModuleRegistry } from "@framework/ModuleRegistry";

import { broadcastChannelsDef } from "./channelDefs";
import { State } from "./state";

ModuleRegistry.registerModule<State>("InplaceVolumetrics", "Inplace volumetrics", [], broadcastChannelsDef);
