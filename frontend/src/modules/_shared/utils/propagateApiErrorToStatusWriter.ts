import { CancelledError, type UseQueryResult } from "@tanstack/react-query";

import type { SettingsStatusWriter, ViewStatusWriter } from "@framework/StatusWriter";
import type { StatusWriter as DpfStatusWriter } from "@framework/types/statusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";

function createErrorMessageFromHelper(
    helper: ApiErrorHelper | null,
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string | null {
    let errorMessage: string | null = null;
    if (helper?.hasError()) {
        errorMessage = helper.makeFullErrorMessage();
        const statusMessage = helper.makeStatusMessage();
        statusWriter.addError(statusMessage);
    }

    return errorMessage;
}

function propagateApiError(error: Error, statusWriter: ViewStatusWriter | SettingsStatusWriter): string | null {
    const helper = ApiErrorHelper.fromError(error);

    return createErrorMessageFromHelper(helper, statusWriter);
}

export function propagateApiErrorToStatusWriter(
    error: Error | null,
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string | null {
    if (!error) return null;

    return propagateApiError(error, statusWriter);
}

export function propagateAllApiErrorsToStatusWriter(
    errors: Error[],
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string[] {
    return errors.map((err) => propagateApiError(err, statusWriter)).filter((error) => error) as string[];
}

function propagateQueryError(
    queryResult: UseQueryResult<any, any>,
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string | null {
    const helper = ApiErrorHelper.fromQueryResult(queryResult);

    return createErrorMessageFromHelper(helper, statusWriter);
}

export function propagateQueryErrorToStatusWriter(
    queryResult: UseQueryResult<any, any>,
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string | null {
    return propagateQueryError(queryResult, statusWriter);
}

export function propagateQueryErrorsToStatusWriter(
    queryResults: UseQueryResult<any, any>[],
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string[] {
    return queryResults.map((res) => propagateQueryError(res, statusWriter)).filter((error) => error) as string[];
}

export function handleOptionalDpfQueryError(err: unknown, statusWriter: DpfStatusWriter): null {
    if (err instanceof CancelledError) {
        throw err;
    }
    const apiError = err instanceof Error ? ApiErrorHelper.fromError(err) : null;
    const message = apiError ? apiError.makeFullErrorMessage() : err instanceof Error ? err.message : String(err);
    statusWriter.addError(message);
    return null;
}
