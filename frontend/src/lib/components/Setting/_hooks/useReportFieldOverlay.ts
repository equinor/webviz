import React from "react";

import type { Overlay } from "../_components/Field";
import { PanelOverlaysContext } from "../_contexts/PanelOverlaysContext";


/**
 * Forwards a Setting.Field's current overlay to the nearest enclosing `Setting.Panel`. No-ops
 * when no `Setting.Panel` is present.
 */
export function useReportFieldOverlay(overlay: Overlay | null): void {
    const fieldId = React.useId();
    const panelReporter = React.useContext(PanelOverlaysContext);

    React.useEffect(
        function reportOverlay() {
            panelReporter?.(fieldId, overlay);

            return function retractOverlay() {
                panelReporter?.(fieldId, null);
            };
        },
        [fieldId, overlay, panelReporter],
    );
}
