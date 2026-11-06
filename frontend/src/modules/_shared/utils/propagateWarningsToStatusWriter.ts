import type { UseQueryResult } from "@tanstack/react-query";

import { getQueryResultWarnings, type DataWithWarnings } from "@api";
import type { SettingsStatusWriter, ViewStatusWriter } from "@framework/StatusWriter";

/**
 * Add warnings (e.g. reported by the back-end alongside query data) to the status writer.
 * Duplicates are only added once. Returns the unique warnings.
 */
export function propagateWarningsToStatusWriter(
    warnings: readonly string[],
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string[] {
    const uniqueWarnings = Array.from(new Set(warnings));
    for (const warning of uniqueWarnings) {
        statusWriter.addWarning(warning);
    }
    return uniqueWarnings;
}

type WithDataWarnings = { data: DataWithWarnings<unknown> | undefined };

/** Add the warnings of results carrying `DataWithWarnings` to the status writer. */
export function propagateDataWarningsToStatusWriter(
    resultsWithWarnings: readonly WithDataWarnings[],
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string[] {
    return propagateWarningsToStatusWriter(
        resultsWithWarnings.flatMap((result) => result.data?.warnings ?? []),
        statusWriter,
    );
}

/** Add the warnings of query results fetched with `withWarnings` to the status writer. */
export function propagateQueryWarningsToStatusWriter(
    queryResults: UseQueryResult<any, any>[],
    statusWriter: ViewStatusWriter | SettingsStatusWriter,
): string[] {
    return propagateWarningsToStatusWriter(
        queryResults.flatMap((query) => getQueryResultWarnings(query)),
        statusWriter,
    );
}
