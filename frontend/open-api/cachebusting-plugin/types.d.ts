import type { IR } from "@hey-api/openapi-ts";

export interface Config {
    /**
     * The name of the plugin.
     */
    name: "cache-busting";
    /**
     * Name of the generated file.
     */
    output: "types";
    /**
     * Endpoints that should have a cache busting field
     */
    targets: string[];

    /**
     * The query parameter to use for caching
     * @default "cacheKey"
     */
    cacheKey?: string | IR.ParameterObject;
}
