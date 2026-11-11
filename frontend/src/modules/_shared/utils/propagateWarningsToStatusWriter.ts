import type { UseQueryResult } from "@tanstack/react-query";

import { getQueryResultWarnings, type ResultWithWarnings } from "@api";
import type { StatusWriter } from "@framework/types/statusWriter";

type WarningStatusWriter = Pick<StatusWriter, "addWarning">;

/**
 * Add warnings (e.g. reported by the back-end alongside query data) to the status writer.
 * Duplicates are only added once. Returns the unique warnings.
 */
export function propagateWarningsToStatusWriter(
    warnings: readonly string[],
    statusWriter: WarningStatusWriter,
): string[] {
    const uniqueWarnings = Array.from(new Set(warnings));
    for (const warning of uniqueWarnings) {
        statusWriter.addWarning(warning);
    }
    return uniqueWarnings;
}

type QueryResultWithWarnings = { data: ResultWithWarnings<unknown> | undefined };

/** Add the warnings of results carrying `ResultWithWarnings` to the status writer. */
export function propagateResultWarningsToStatusWriter(
    resultsWithWarnings: readonly QueryResultWithWarnings[],
    statusWriter: WarningStatusWriter,
): string[] {
    return propagateWarningsToStatusWriter(
        resultsWithWarnings.flatMap((result) => result.data?.warnings ?? []),
        statusWriter,
    );
}

/** Add the warnings of query results fetched with `withWarnings` to the status writer. */
export function propagateQueryWarningsToStatusWriter(
    queryResults: UseQueryResult<any, any>[],
    statusWriter: WarningStatusWriter,
): string[] {
    return propagateWarningsToStatusWriter(
        queryResults.flatMap((query) => getQueryResultWarnings(query)),
        statusWriter,
    );
}
