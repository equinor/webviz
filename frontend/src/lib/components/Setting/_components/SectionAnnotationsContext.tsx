import React from "react";

export type FieldAnnotationSummary = {
    hasError: boolean;
    hasWarning: boolean;
};

export type SectionAnnotationsContextValue = {
    reportField: (id: string, summary: FieldAnnotationSummary) => void;
    unregisterField: (id: string) => void;
};

/**
 * Lets a Setting.Field report its own error/warning state up to the nearest enclosing Setting.Section,
 * which aggregates them into a count shown in its header. `null` when a Field is used outside any
 * Section (e.g. directly inside a Panel) - Fields no-op in that case.
 */
export const SectionAnnotationsContext = React.createContext<SectionAnnotationsContextValue | null>(null);
