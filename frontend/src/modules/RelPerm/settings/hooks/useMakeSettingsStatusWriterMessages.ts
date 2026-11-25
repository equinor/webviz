import React from "react";

import { useAtomValue } from "jotai";

import type { SettingsStatusWriter } from "@framework/StatusWriter";
import type { SettingAnnotation } from "@lib/components/Setting";
import { useFlagActionRequiredToStatusWriter } from "@modules/_shared/hooks/useAddStatusWriterMessages";
import { propagateQueryErrorsToStatusWriter } from "@modules/_shared/utils/propagateApiErrorToStatusWriter";
import { propagateWarningsToStatusWriter } from "@modules/_shared/utils/propagateWarningsToStatusWriter";

import { relPermDataAccessorStatusAtom } from "../atoms/derivedAtoms";
import { relPermTableDefinitionQueriesAtom, relPermTableNamesQueriesAtom } from "../atoms/queryAtoms";

/**
 * Single place for all `statusWriter` writes for the RelPerm settings:
 * - Propagates table name and table definition query errors.
 * - Propagates warnings reported by the back-end alongside the realization data (e.g. missing realizations).
 * - Exposes `handlePanelAnnotationsChange` for `Setting.Panel`'s `onAnnotationsChange`, so every
 *   field's error annotations are reported as ActionRequired.
 */
export function useMakeSettingsStatusWriterMessages(statusWriter: SettingsStatusWriter): {
    handlePanelAnnotationsChange: (annotations: SettingAnnotation[]) => void;
} {
    const tableNameQueries = useAtomValue(relPermTableNamesQueriesAtom);
    const tableDefinitionQueries = useAtomValue(relPermTableDefinitionQueriesAtom);
    const relPermDataAccessorStatus = useAtomValue(relPermDataAccessorStatusAtom);
    const addActionRequiredToStatusWriter = useFlagActionRequiredToStatusWriter(statusWriter);

    propagateQueryErrorsToStatusWriter(tableNameQueries, statusWriter);
    propagateQueryErrorsToStatusWriter(tableDefinitionQueries, statusWriter);
    propagateWarningsToStatusWriter(relPermDataAccessorStatus.warnings, statusWriter);

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
