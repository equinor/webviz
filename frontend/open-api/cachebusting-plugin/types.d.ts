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
     * The query parameter to use for caching
     * @default "t"
     */
    cacheKey?: string | IR.ParameterObject;
}
