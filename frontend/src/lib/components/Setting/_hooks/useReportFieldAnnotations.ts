import React from "react";

import type { SettingAnnotation } from "../_components/Field";
import { PanelAnnotationsContext } from "../_contexts/PanelAnnotationsContext";


/**
 * Forwards a Setting.Field's current annotation list to the nearest enclosing `Setting.Panel`
 * (powers `onAnnotationsChange`). `null` reports nothing. No-ops when no `Setting.Panel` is present.
 */
export function useReportFieldAnnotations(annotations: SettingAnnotation[] | null): void {
    const fieldId = React.useId();
    const panelReporter = React.useContext(PanelAnnotationsContext);

    React.useEffect(
        function reportAnnotations() {
            if (annotations === null) {
                return;
            }
            panelReporter?.(fieldId, annotations);

            return function retractAnnotations() {
                panelReporter?.(fieldId, []);
            };
        },
        [fieldId, annotations, panelReporter],
    );
}
