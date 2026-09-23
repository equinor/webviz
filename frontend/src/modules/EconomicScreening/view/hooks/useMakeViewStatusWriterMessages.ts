import { useAtomValue } from "jotai";

import type { ViewStatusWriter } from "@framework/StatusWriter";

import { sourceSnapshotAtom } from "../atoms/baseAtoms";
import { economicScreeningResultsAtom } from "../atoms/derivedAtoms";

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter): void {
    const { warnings, errors } = useAtomValue(economicScreeningResultsAtom);
    const queryError = useAtomValue(sourceSnapshotAtom).queryError;

    if (queryError) {
        statusWriter.addError(queryError);
    }
    for (const error of errors) {
        statusWriter.addError(error);
    }
    for (const warning of warnings) {
        statusWriter.addWarning(warning);
    }
}
