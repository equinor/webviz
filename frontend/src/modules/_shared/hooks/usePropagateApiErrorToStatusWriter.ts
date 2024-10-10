import { SettingsStatusWriter, ViewStatusWriter } from "@framework/StatusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { UseQueryResult } from "@tanstack/react-query";

function propagateError(
    queryResult: UseQueryResult<any, any>,
    statusWriter: ViewStatusWriter | SettingsStatusWriter
): string | null {
    const helper = ApiErrorHelper.fromQueryResult(queryResult);

    let errorMessage: string | null = null;
    if (helper?.hasError()) {
        errorMessage = helper.makeFullErrorMessage();
        const statusMessage = helper.makeStatusMessage();
        statusWriter.addError(statusMessage);
    }

    return errorMessage;
}

export function usePropagateApiErrorToStatusWriter(
    queryResult: UseQueryResult<any, any>,
    statusWriter: ViewStatusWriter | SettingsStatusWriter
): string | null {
    return propagateError(queryResult, statusWriter);
}

export function usePropagateAllApiErrorsToStatusWriter(
    queryResults: UseQueryResult<any, any>[],
    statusWriter: ViewStatusWriter | SettingsStatusWriter
): (string | null)[] {
    return queryResults.map((res) => propagateError(res, statusWriter)).filter((error) => error);
}
