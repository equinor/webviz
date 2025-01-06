/* istanbul ignore file */

/* tslint:disable */

/* eslint-disable */
import { ModuleInstance } from "@framework/ModuleInstance";

import type { ApiRequestOptions } from "./auto-generated/core/ApiRequestOptions";
import { BaseHttpRequest } from "./auto-generated/core/BaseHttpRequest";
import type { CancelablePromise } from "./auto-generated/core/CancelablePromise";
import type { OpenAPIConfig } from "./auto-generated/core/OpenAPI";
import { request as __request } from "./auto-generated/core/request";

export function createModuleInstanceHttpRequestClass(moduleInstance: ModuleInstance<any>) {
    return class ModuleInstanceHttpRequest extends BaseHttpRequest {
        private readonly _moduleInstance: ModuleInstance<any> = moduleInstance;
        private _warnings: Map<string, string[]> = new Map();

        constructor(config: OpenAPIConfig) {
            super(config);
        }

        private setWarnings(hash: string, warnings: string[]): void {
            this._warnings.set(hash, warnings);
            const allWarnings = Array.from(this._warnings.values()).reduce((acc, val) => acc.concat(val), []);
            this._moduleInstance.setApiWarnings(allWarnings);
        }

        private makeHashFromOptions(options: ApiRequestOptions): string {
            return JSON.stringify({
                method: options.method,
                url: options.url,
                path: options.path,
            });
        }

        /**
         * Request method
         * @param options The request options from the service
         * @returns CancelablePromise<T>
         * @throws ApiError
         */
        public override request<T>(options: ApiRequestOptions): CancelablePromise<T> {
            const hash = this.makeHashFromOptions(options);
            const setWarnings = this.setWarnings.bind(this, hash);
            return __request(this.config, options, setWarnings);
        }
    };
}
