import { ViewStatusWriter } from "@framework/StatusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";

import { useAtomValue } from "jotai";

import { identifiersValuesAtom } from "../atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter) {
    const queriesResult = useAtomValue(aggregatedTableDataQueriesAtom);
    const identifiersValues = useAtomValue(identifiersValuesAtom);

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

    for (const elm of identifiersValues) {
        if (elm.values.length === 0) {
            statusWriter.addWarning(`Select at least one filter value for ${elm.identifier.valueOf()}`);
        }
    }
}
