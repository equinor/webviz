import type { Plugin } from "@hey-api/openapi-ts";

import { handler } from "./plugin";
import type { Config } from "./types";

export const defaultConfig: Plugin.Config<Config> = {
    name: "cache-busting",
    output: "types",
    cacheKey: "t",
    // No need to define this
    _handlerLegacy: () => {},
    _handler: handler,
};

export const makePlugin: Plugin.DefineConfig<Config> = (config) => ({
    ...defaultConfig,
    ...config,
});
