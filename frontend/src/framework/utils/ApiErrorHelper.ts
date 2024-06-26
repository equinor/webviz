import { ApiError } from "@api";
import { UseQueryResult } from "@tanstack/react-query";

export class ApiErrorHelper {
    private _error: ApiError | null = null;
    private _statusCode: number | null = null;
    private _service: string | null = null;
    private _type: string | null = null;
    private _message: string | null = null;

    private constructor(readonly error: ApiError) {
        this._error = error;
        this._statusCode = error.status;
        this.extractInfoFromError(error);
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

    private extractInfoFromError(apiError: ApiError): void {
        if (!apiError.body || typeof apiError.body !== "object") {
            return;
        }

        if (!("error" in apiError.body)) {
            return;
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
}
