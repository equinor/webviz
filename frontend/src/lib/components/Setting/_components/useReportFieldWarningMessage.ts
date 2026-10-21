import React from "react";

import type { FieldWarningMessageReporter } from "./PanelWarningMessagesContext";
import { PanelWarningMessagesContext } from "./PanelWarningMessagesContext";

/**
 * Forwards a Setting.Field's current warning message to the nearest enclosing `Setting.Panel`.
 * No-ops when no `Setting.Panel` is present.
 */
export function useReportFieldWarningMessage(message: string | null): void {
    const fieldId = React.useId();
    const panelReporter = React.useContext(PanelWarningMessagesContext);

    React.useEffect(
        function reportWarningMessage() {
            report(panelReporter, fieldId, message);

            return function retractWarningMessage() {
                report(panelReporter, fieldId, null);
            };
        },
        [fieldId, message, panelReporter],
    );
}

function report(reporter: FieldWarningMessageReporter | undefined, fieldId: string, message: string | null): void {
    reporter?.(fieldId, message);
}
