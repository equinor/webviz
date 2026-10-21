import React from "react";

/**
 * Reports a Setting.Field's current warning message to an ancestor, keyed by field id. `null`
 * retracts the entry (warning resolved, or field unmounted).
 */
export type FieldWarningMessageReporter = (fieldId: string, message: string | null) => void;

/**
 * Panel-scoped warning-message context: `Setting.Panel` provides this so descendant
 * `Setting.Field`s can report their `warningMessage`, aggregated and forwarded to
 * `onWarningMessagesChange`. Defaults to `undefined` (no-op) when used standalone (e.g.
 * Storybook/tests).
 */
export const PanelWarningMessagesContext = React.createContext<FieldWarningMessageReporter | undefined>(undefined);
