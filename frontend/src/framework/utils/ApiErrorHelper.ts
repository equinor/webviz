import { ApiError } from "@api";
import { Origin, StatusMessage } from "@framework/ModuleInstanceStatusController";
import { UseQueryResult } from "@tanstack/react-query";

import { ApiRequestOptions } from "src/api/core/ApiRequestOptions";

export class ApiErrorHelper {
    private _error: ApiError;
    private _statusCode: number;
    private _endpoint: string;
    private _request: ApiRequestOptions;
    private _service: string | null = null;
    private _type: string | null = null;
    private _message: string | null = null;

    private constructor(readonly error: ApiError) {
        this._error = error;
        this._statusCode = error.status;
        this._endpoint = error.url;
        this._request = error.request;
        this.extractInfoFromErrorBody(error);
    }

    static fromQueryResult(queryResult: UseQueryResult<any>): ApiErrorHelper | null {
        if (!queryResult.error || !(queryResult.error instanceof ApiError)) {
            return null;
        }
        return new ApiErrorHelper(queryResult.error);
    }

    static fromError(error: Error): ApiErrorHelper | null {
        if (!(error instanceof ApiError)) {
            return null;
        }
        return new ApiErrorHelper(error);
    }

    private extractInfoFromErrorBody(apiError: ApiError): void {
        if (!apiError.body || typeof apiError.body !== "object") {
            return;
        }

        if (!("error" in apiError.body)) {
            return;
        }

        if ("url" in apiError) {
            this._endpoint = apiError.url;
        }

        if ("type" in apiError.body.error) {
            this._type = apiError.body.error.type;
        }

        if ("message" in apiError.body.error) {
            this._message = apiError.body.error.message;
        }

        if ("service" in apiError.body.error) {
            this._service = apiError.body.error.service;
        }

        if (!("type" in apiError.body.error) || !("message" in apiError.body.error)) {
            return;
        }

        this._type = apiError.body.error.type;
        this._message = apiError.body.error.message;
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
        return this._statusCode;
    }

    getEndPoint(): string {
        return this._endpoint;
    }

    getRequest(): ApiRequestOptions {
        return this._request;
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
            errorMessage = `${this.getMessage()} (${additionalInformation.join(", ")})`;
        }

        return errorMessage;
    }

    makeStatusMessage(): StatusMessage {
        return {
            message: this.makeFullErrorMessage(),
            origin: Origin.API,
            endpoint: this.getEndPoint(),
            request: this.getRequest(),
        };
    }
}
