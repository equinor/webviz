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

        setWarnings(warnings: string[]): void {
            this._moduleInstance.addWarnings(warnings);
        }

        /**
         * Request method
         * @param options The request options from the service
         * @returns CancelablePromise<T>
         * @throws ApiError
         */
        public override request<T>(options: ApiRequestOptions): CancelablePromise<T> {
            return __request(this.config, options, this.setWarnings.bind(this));
        }
    };
}
