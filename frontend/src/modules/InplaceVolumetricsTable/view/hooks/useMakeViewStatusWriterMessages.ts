import { ViewStatusWriter } from "@framework/StatusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";

import { useAtomValue } from "jotai";

import { activeQueriesResultAtom, identifiersValuesAtom } from "../atoms/derivedAtoms";

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter) {
    const activeQueriesResult = useAtomValue(activeQueriesResultAtom);
    const identifiersValues = useAtomValue(identifiersValuesAtom);

    const errors = activeQueriesResult.errors;

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
