import type { UseQueryResult } from "@tanstack/react-query";

import type { SettingsStatusWriter, ViewStatusWriter } from "@framework/StatusWriter";
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

export function usePropagateApiErrorToStatusWriter(
    error: Error,
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string | null {
    return propagateApiError(error, statusWriter);
}

export function usePropagateAllApiErrorsToStatusWriter(
    errors: Error[],
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): (string | null)[] {
    return errors.map((err) => propagateApiError(err, statusWriter)).filter((error) => error);
}

function propagateQueryError(
    queryResult: UseQueryResult<any, any>,
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string | null {
    const helper = ApiErrorHelper.fromQueryResult(queryResult);

    return createErrorMessageFromHelper(helper, statusWriter);
}

export function usePropagateQueryErrorToStatusWriter(
    queryResult: UseQueryResult<any, any>,
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string | null {
    return propagateQueryError(queryResult, statusWriter);
}

export function usePropagateQueryErrorsToStatusWriter(
    queryResults: UseQueryResult<any, any>[],
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): (string | null)[] {
    return queryResults.map((res) => propagateQueryError(res, statusWriter)).filter((error) => error);
}
