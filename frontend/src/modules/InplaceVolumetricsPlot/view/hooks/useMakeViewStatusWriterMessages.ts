import { ViewStatusWriter } from "@framework/StatusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";

import { useAtomValue } from "jotai";

import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter) {
    const queriesResult = useAtomValue(aggregatedTableDataQueriesAtom);

    if (!queriesResult.someQueriesFailed) {
        return;
    }

    const errors = queriesResult.errors;
    for (const error of errors) {
        const helper = ApiErrorHelper.fromError(error);
        if (helper) {
            statusWriter.addError(helper.makeStatusMessage());
        }
    }
}
