import React from "react";

import type { Overlay } from "./Field";
import type { FieldOverlayReporter } from "./PanelOverlaysContext";
import { PanelOverlaysContext } from "./PanelOverlaysContext";

/**
 * Forwards a Setting.Field's current overlay to the nearest enclosing `Setting.Panel`. No-ops
 * when no `Setting.Panel` is present.
 */
export function useReportFieldOverlay(overlay: Overlay | null): void {
    const fieldId = React.useId();
    const panelReporter = React.useContext(PanelOverlaysContext);

    React.useEffect(
        function reportOverlay() {
            report(panelReporter, fieldId, overlay);

            return function retractOverlay() {
                report(panelReporter, fieldId, null);
            };
        },
        [fieldId, overlay, panelReporter],
    );
}

function report(reporter: FieldOverlayReporter | undefined, fieldId: string, overlay: Overlay | null): void {
    reporter?.(fieldId, overlay);
}
