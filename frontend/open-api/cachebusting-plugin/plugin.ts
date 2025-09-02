import type { IR } from "@hey-api/openapi-ts";
import { set } from "lodash";

import type { CacheBustingPlugin } from "./types";

export const handler: CacheBustingPlugin["Handler"] = ({ plugin }) => {
    const cacheKeyCfg = plugin.config.cacheKey;

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
            schema: { type: "number" },
            style: "form",
        };
    }

    plugin.forEach("operation", (event) => {
        if (event.operation.parameters?.query?.[cacheKey]) {
            throw Error(
                `Cannot add cache busting parameter. Operation ${event.operation.id} already has already defined ${cacheKey} as a query field!`,
            );
        }

        set(event, `operation.parameters.query.${cacheKey}`, cacheParmObj);
    });
};
