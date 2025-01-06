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

        constructor(config: OpenAPIConfig) {
            super(config);
        }

        private setWarnings(warnings: string[]): void {
            this._moduleInstance.setApiWarnings(warnings);
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
            const setWarnings = this.setWarnings.bind(this);
            return __request(this.config, options, setWarnings);
        }
    };
}
