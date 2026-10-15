import type { DefinePlugin, IR } from "@hey-api/openapi-ts";

export interface Config {
    /**
     * The name of the plugin.
     */
    name: "cache-busting";

    /**
     * The query parameter to use for caching
     * @default "_cacheBusting"
     */
    cacheKey?: string | IR.ParameterObject;
}

export type CacheBustingPlugin = DefinePlugin<Config>;
