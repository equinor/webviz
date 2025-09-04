import type { Plugin } from "vite";

import { generateModuleSerializedStateMap } from "../scripts/generate-module-states-map.js";

export function moduleStatesMapPlugin(): Plugin {
    return {
        name: "generate-module-serialized-state-map",

        async buildStart() {
            await generateModuleSerializedStateMap();
        },
    };
}
