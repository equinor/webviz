import { SettingsStatusWriter, ViewStatusWriter } from "@framework/StatusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { UseQueryResult } from "@tanstack/react-query";

export function usePropagateApiErrorToStatusWriter(
    queryResult: UseQueryResult<any, any>,
    statusWriter: ViewStatusWriter | SettingsStatusWriter
): string | null {
    const helper = ApiErrorHelper.fromQueryResult(queryResult);

    let errorMessage = "";
    if (helper?.hasError()) {
        errorMessage = helper.makeFullErrorMessage();
        statusWriter.addError(errorMessage);
    }

    return errorMessage;
}
