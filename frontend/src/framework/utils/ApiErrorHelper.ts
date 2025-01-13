import { Origin, StatusMessage } from "@framework/ModuleInstanceStatusController";
import { UseQueryResult } from "@tanstack/react-query";

import { AxiosError, InternalAxiosRequestConfig } from "axios";
import { isObject } from "lodash";

export class ApiErrorHelper {
    private _error: AxiosError;
    private _statusCode: number | undefined;
    private _endpoint: string;
    private _requestConfig: InternalAxiosRequestConfig | undefined;
    private _service: string | null = null;
    private _type: string | null = null;
    private _message: string | null = null;

    private constructor(readonly error: AxiosError) {
        this._error = error;
        this._statusCode = error.status;
        this._endpoint = error.config?.url ?? "Unknown endpoint";
        this._requestConfig = error.config;
        this.extractInfoFromErrorBody(error);
    }

    static fromQueryResult(queryResult: UseQueryResult<any>): ApiErrorHelper | null {
        if (!queryResult.error || !(queryResult.error instanceof AxiosError)) {
            return null;
        }
        return new ApiErrorHelper(queryResult.error);
    }

    static fromError(error: Error): ApiErrorHelper | null {
        if (!(error instanceof AxiosError)) {
            return null;
        }
        return new ApiErrorHelper(error);
    }

    private extractInfoFromErrorBody(apiError: AxiosError): void {
        if (!apiError.response?.data || typeof apiError.response.data !== "object") {
            return;
        }

        const data = apiError.response.data;

        if (!("error" in data)) {
            return;
        }

        const error = data.error;

        if (!isObject(error)) {
            return;
        }

        if ("url" in apiError) {
            this._endpoint = apiError.config?.url ?? "Unknown endpoint";
        }

        if ("type" in error && typeof error.type === "string") {
            this._type = error.type;
        }

        if ("message" in error && typeof error.message === "string") {
            this._message = error.message;
        }

        if ("service" in error && typeof error.service === "string") {
            this._service = error.service;
        }

        if (!("type" in error) || !("message" in error)) {
            return;
        }

        this._type = JSON.stringify(error.type);
        this._message = JSON.stringify(error.message);
    }

    hasError(): boolean {
        return this._error !== null;
    }

    getService(): string | null {
        return this._service;
    }

    getType(): string | null {
        return this._type;
    }

    getMessage(): string | null {
        return this._message;
    }

    getStatusCode(): number | null {
        return this._statusCode ?? null;
    }

    getEndPoint(): string {
        return this._endpoint;
    }

    getRequestConfig(): InternalAxiosRequestConfig | undefined {
        return this._requestConfig;
    }

    makeFullErrorMessage(): string {
        let errorMessage = "";
        if (this.hasError()) {
            const additionalInformation: string[] = [];
            if (this.getService()) {
                additionalInformation.push(`${this.getService()?.toUpperCase()}`);
            }
            if (this.getType()) {
                additionalInformation.push(`${this.getType()}`);
            }
            if (this.getStatusCode()) {
                additionalInformation.push(`${this.getStatusCode()}`);
            }
            errorMessage = `${this.getMessage() ?? "Unknown error"} (${additionalInformation.join(", ")})`;
        }

        return errorMessage;
    }

    makeStatusMessage(): StatusMessage {
        return {
            message: this.makeFullErrorMessage(),
            origin: Origin.API,
            endpoint: this.getEndPoint(),
            request: this.getRequestConfig(),
        };
    }
}
