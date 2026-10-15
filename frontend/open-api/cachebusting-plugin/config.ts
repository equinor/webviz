import { definePluginConfig } from "@hey-api/openapi-ts";

import { handler } from "./plugin";
import type { CacheBustingPlugin } from "./types";

export const defaultConfig: CacheBustingPlugin["Config"] = {
    name: "cache-busting",
    handler: handler,
    config: {
        cacheKey: "_cacheBusting",
    },
};

export const makePlugin = definePluginConfig(defaultConfig);
