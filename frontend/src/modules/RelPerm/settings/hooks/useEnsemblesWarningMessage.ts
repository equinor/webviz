import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { commonTableNamesAreMissingAtom } from "../atoms/derivedAtoms";
import { selectedEnsembleIdentsAtom } from "../atoms/persistableFixableAtoms";
import { relPermTableNamesQueriesAtom } from "../atoms/queryAtoms";

/**
 * Warning for the Ensembles field when the table names query fails for some, but not all, of the valid
 * selected ensembles. Empty results and all-failed are covered by the table name setting's own annotations.
 */
export function useEnsemblesWarningMessage(ensembleSet: EnsembleSet): string | undefined {
    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom).value;
    const tableNameQueries = useAtomValue(relPermTableNamesQueriesAtom);
    const commonTableNamesAreMissing = useAtomValue(commonTableNamesAreMissingAtom);

    const failedEnsembleIdents = new Set<RegularEnsembleIdent>();
    for (const [index, ensembleIdent] of selectedEnsembleIdents.entries()) {
        if (tableNameQueries[index]?.isError) {
            failedEnsembleIdents.add(ensembleIdent);
        }
    }

    function toEnsembleNames(ensembleIdents: Iterable<RegularEnsembleIdent>): string {
        return [...ensembleIdents]
            .map(
                (ensembleIdent) =>
                    ensembleSet.findEnsemble(ensembleIdent)?.getDisplayName() ?? ensembleIdent.toString(),
            )
            .join(", ");
    }

    function makeContributionText(count: number): string {
        return `${count > 1 ? "They do" : "It does"} not contribute to the available table names.`;
    }

    const messages: string[] = [];
    if (failedEnsembleIdents.size > 0 && failedEnsembleIdents.size < selectedEnsembleIdents.length) {
        messages.push(
            `No relperm tables found for ${toEnsembleNames(failedEnsembleIdents)}. ${makeContributionText(failedEnsembleIdents.size)}`,
        );
    }

    const loadedTableNameSets = tableNameQueries.flatMap((query) => (query.data ? [query.data] : []));
    if (loadedTableNameSets.length > 0 && loadedTableNameSets.every((tableNames) => tableNames.length === 0)) {
        messages.push(
            loadedTableNameSets.length === 1
                ? "Selected ensemble has no relperm table names."
                : "Selected ensembles have no relperm table names.",
        );
    } else if (commonTableNamesAreMissing) {
        messages.push("Selected ensembles have no common relperm table names.");
    }

    return messages.length > 0 ? messages.join(" ") : undefined;
}
