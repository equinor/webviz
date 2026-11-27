import React from "react";

import type { FieldStatusSummary } from "../_contexts/SectionStatusContext";
import { SectionStatusContext } from "../_contexts/SectionStatusContext";

/**
 * Forwards a field's status to the nearest enclosing `Setting.Section`, which aggregates the statuses into its
 * header counts. `null` reports nothing. No-ops when no `Setting.Section` is present.
 */
export function useReportFieldStatus(summary: FieldStatusSummary | null): void {
    const fieldId = React.useId();
    const sectionStatus = React.useContext(SectionStatusContext);

    // Depend on the primitives so a new-but-equal summary object does not re-report
    const hasSummary = summary !== null;
    const hasInvalidValue = summary?.hasInvalidValue ?? false;
    const hasError = summary?.hasError ?? false;
    const hasWarning = summary?.hasWarning ?? false;
    const hasInfo = summary?.hasInfo ?? false;

    React.useEffect(
        function reportFieldStatus() {
            if (!hasSummary || !sectionStatus) {
                return;
            }
            sectionStatus.reportField(fieldId, { hasInvalidValue, hasError, hasWarning, hasInfo });

            return function unregisterFieldStatus() {
                sectionStatus.unregisterField(fieldId);
            };
        },
        [fieldId, sectionStatus, hasSummary, hasInvalidValue, hasError, hasWarning, hasInfo],
    );
}
