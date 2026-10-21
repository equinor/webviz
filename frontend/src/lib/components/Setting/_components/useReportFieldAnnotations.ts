import React from "react";

import type { SettingAnnotation } from "./Field";
import type { FieldAnnotationsReporter } from "./PanelAnnotationsContext";
import { PanelAnnotationsContext } from "./PanelAnnotationsContext";

/**
 * Forwards a Setting.Field's current annotation list to the nearest enclosing `Setting.Panel`
 * (powers `onAnnotationsChange`). No-ops when no `Setting.Panel` is present.
 */
export function useReportFieldAnnotations(annotations: SettingAnnotation[]): void {
    const fieldId = React.useId();
    const panelReporter = React.useContext(PanelAnnotationsContext);

    React.useEffect(
        function reportAnnotations() {
            report(panelReporter, fieldId, annotations);

            return function retractAnnotations() {
                report(panelReporter, fieldId, []);
            };
        },
        [fieldId, annotations, panelReporter],
    );
}

function report(
    reporter: FieldAnnotationsReporter | undefined,
    fieldId: string,
    annotations: SettingAnnotation[],
): void {
    reporter?.(fieldId, annotations);
}
