import React from "react";

import type { SettingAnnotation } from "../_components/Field";
import { PanelAnnotationsContext } from "../_contexts/PanelAnnotationsContext";


/**
 * Forwards a Setting.Field's current annotation list to the nearest enclosing `Setting.Panel`
 * (powers `onAnnotationsChange`). No-ops when no `Setting.Panel` is present.
 */
export function useReportFieldAnnotations(annotations: SettingAnnotation[]): void {
    const fieldId = React.useId();
    const panelReporter = React.useContext(PanelAnnotationsContext);

    React.useEffect(
        function reportAnnotations() {
            panelReporter?.(fieldId, annotations);

            return function retractAnnotations() {
                panelReporter?.(fieldId, []);
            };
        },
        [fieldId, annotations, panelReporter],
    );
}
