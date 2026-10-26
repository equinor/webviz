import React from "react";

import { useAtomValue } from "jotai";

import type { EnsembleSet } from "@framework/EnsembleSet";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { SettingsStatusWriter } from "@framework/StatusWriter";
import type { SettingAnnotation } from "@lib/components/Setting";
import { useAddActionRequiredToStatusWriter } from "@modules/_shared/hooks/useAddStatusWriterMessages";
import { propagateQueryErrorsToStatusWriter } from "@modules/_shared/utils/propagateApiErrorToStatusWriter";

import { selectedEnsembleIdentsAtom, selectedTableNameAtom } from "../atoms/persistableFixableAtoms";
import { relPermTableDefinitionQueriesAtom, relPermTableNamesQueriesAtom } from "../atoms/queryAtoms";

/**
 * Single place for all `statusWriter` writes for the RelPerm settings:
 * - Propagates table name and table definition query errors.
 * - Warns when filtered realizations are missing from the selected table in an ensemble.
 * - Exposes `handlePanelAnnotationsChange` for `Setting.Panel`'s `onAnnotationsChange`, so every
 *   field's error annotations are reported as ActionRequired.
 */
export function useMakeSettingsStatusWriterMessages(
    statusWriter: SettingsStatusWriter,
    ensembleSet: EnsembleSet,
    filterEnsembleRealizationsFunc: (ensembleIdent: RegularEnsembleIdent) => readonly number[],
): {
    handlePanelAnnotationsChange: (annotations: SettingAnnotation[]) => void;
} {
    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom).value;
    const selectedTableName = useAtomValue(selectedTableNameAtom).value;
    const tableNameQueries = useAtomValue(relPermTableNamesQueriesAtom);
    const tableDefinitionQueries = useAtomValue(relPermTableDefinitionQueriesAtom);
    const addActionRequiredToStatusWriter = useAddActionRequiredToStatusWriter(statusWriter);

    propagateQueryErrorsToStatusWriter(tableNameQueries, statusWriter);
    propagateQueryErrorsToStatusWriter(tableDefinitionQueries, statusWriter);

    for (const [index, query] of tableDefinitionQueries.entries()) {
        const tableDefinition = query.data;
        const ensembleIdent = selectedEnsembleIdents[index];
        if (!tableDefinition || !ensembleIdent) {
            continue;
        }

        const tableRealizations = new Set(tableDefinition.realizations);
        const missingRealizations = filterEnsembleRealizationsFunc(ensembleIdent).filter(
            function isMissingFromTable(realization) {
                return !tableRealizations.has(realization);
            },
        );
        if (missingRealizations.length === 0) {
            continue;
        }

        const ensembleName = ensembleSet.findEnsemble(ensembleIdent)?.getDisplayName() ?? ensembleIdent.toString();
        statusWriter.addWarning(
            `RelPerm table ${selectedTableName ?? ""} has no data for ${missingRealizations.length} filtered realizations in ${ensembleName}: ${formatRealizationList(missingRealizations)}.`,
        );
    }

    const handlePanelAnnotationsChange = React.useCallback(
        function handlePanelAnnotationsChange(annotations: SettingAnnotation[]) {
            const invalidFieldValueMessages = annotations
                .filter((annotation) => annotation.type === "error")
                .map((annotation) => annotation.message);
            addActionRequiredToStatusWriter(invalidFieldValueMessages);
        },
        [addActionRequiredToStatusWriter],
    );

    return { handlePanelAnnotationsChange };
}

function formatRealizationList(realizations: readonly number[]): string {
    const sortedRealizations = [...realizations].sort((left, right) => left - right);
    const visibleRealizations = sortedRealizations.slice(0, 20);
    const suffix = sortedRealizations.length > visibleRealizations.length ? ", ..." : "";

    return `${visibleRealizations.join(", ")}${suffix}`;
}
