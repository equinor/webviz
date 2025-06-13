import type { IR, Plugin } from "@hey-api/openapi-ts";

import type { Config } from "./types";

export const handler: Plugin.Handler<Config> = ({ context, plugin }) => {
    const cacheKeyCfg = plugin.cacheKey;

    let cacheKey: string;
    let cacheParmObj: IR.ParameterObject;

    if (typeof cacheKeyCfg === "object") {
        cacheKey = cacheKeyCfg.name;
        cacheParmObj = cacheKeyCfg;
    } else if (typeof cacheKeyCfg === "string") {
        cacheKey = cacheKeyCfg;
        cacheParmObj = {
            location: "query",
            explode: false,
            name: cacheKey,
            schema: { type: "string" },
            style: "form",
        };
    }

    context.subscribe("operation", (ctx) => {
        if (plugin.targets.includes(ctx.operation.id)) {
            const existingParams = ctx.operation.parameters;

            ctx.operation.parameters = {
                ...existingParams,
                query: {
                    ...existingParams?.query,
                    [cacheKey]: cacheParmObj,
                },
            };
        }
    });
};
