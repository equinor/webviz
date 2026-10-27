import React from "react";

export type FieldStatusSummary = {
    /** A `type: "error"` annotation - the field's value is invalid. Shown with a Block icon. */
    hasInvalidValue: boolean;
    /** A complete overlay failure (`overlay.type === "error"`). Shown with an Error icon. */
    hasErrorOverlay: boolean;
    /** A warning annotation, warning overlay, or warningMessage. Shown with a Warning icon. */
    hasAnyWarning: boolean;
    /** An info annotation or info overlay, e.g. the field is blocked until another invalid setting is fixed. Shown with an Info icon. */
    hasAnyInfo: boolean;
};

export type SectionStatusContextValue = {
    reportField: (id: string, summary: FieldStatusSummary) => void;
    unregisterField: (id: string) => void;
};

/**
 * Lets a Setting.Field report its status up to the nearest enclosing Setting.Section, which
 * aggregates them into header counts. `null` outside a Section - Fields no-op in that case.
 */
export const SectionStatusContext = React.createContext<SectionStatusContextValue | null>(null);
