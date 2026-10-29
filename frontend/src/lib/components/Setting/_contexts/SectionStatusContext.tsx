import React from "react";

export type FieldStatusSummary = {
    /** The reporter's value is invalid. Shown with a Block icon. */
    hasInvalidValue: boolean;
    /** The reporter has an error. Shown with an Error icon. */
    hasError: boolean;
    /** The reporter has a warning. Shown with a Warning icon. */
    hasWarning: boolean;
    /** The reporter has an info. Shown with an Info icon. */
    hasInfo: boolean;
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
