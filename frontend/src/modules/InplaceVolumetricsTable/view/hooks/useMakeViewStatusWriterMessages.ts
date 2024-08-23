import { ViewStatusWriter } from "@framework/StatusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";

import { useAtomValue } from "jotai";

import { activeQueriesResultAtom } from "../atoms/derivedAtoms";

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter) {
    const activeQueriesResult = useAtomValue(activeQueriesResultAtom);

    const errors = activeQueriesResult.errors;

    for (const error of errors) {
        const helper = ApiErrorHelper.fromError(error);
        if (helper) {
            statusWriter.addError(helper.makeStatusMessage());
        }
    }
}
