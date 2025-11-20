import { useAtomValue } from "jotai";

import type { ViewStatusWriter } from "@framework/StatusWriter";
import { usePropagateAllApiErrorsToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { indicesWithValuesAtom } from "../atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "../atoms/queryAtoms";

export function useMakeViewStatusWriterMessages(statusWriter: ViewStatusWriter) {
    const queriesResult = useAtomValue(aggregatedTableDataQueriesAtom);
    const indicesWithValues = useAtomValue(indicesWithValuesAtom);

    usePropagateAllApiErrorsToStatusWriter(queriesResult.errors, statusWriter);

    for (const elm of indicesWithValues) {
        if (elm.values.length === 0) {
            statusWriter.addWarning(`Select at least one filter value for ${elm.indexColumn.valueOf()}`);
        }
    }
}
