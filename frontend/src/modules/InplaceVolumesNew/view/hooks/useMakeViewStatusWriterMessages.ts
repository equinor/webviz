import { useAtomValue } from "jotai";

import type { ViewStatusWriter } from "@framework/StatusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";

import { indicesWithValuesAtom } from "../atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter) {
    const queriesResult = useAtomValue(aggregatedTableDataQueriesAtom);
    const indicesWithValues = useAtomValue(indicesWithValuesAtom);

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

    for (const elm of indicesWithValues) {
        if (elm.values.length === 0) {
            statusWriter.addWarning(`Select at least one filter value for ${elm.indexColumn.valueOf()}`);
        }
    }
}
