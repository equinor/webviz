import React from "react";

import type { Overlay } from "./Field";

/**
 * Reports a Setting.Field's current overlay to an ancestor, keyed by field id. `null` retracts the
 * entry (overlay removed, or field unmounted).
 */
export type FieldOverlayReporter = (fieldId: string, overlay: Overlay | null) => void;

/**
 * Panel-scoped overlay context: `Setting.Panel` provides this so descendant `Setting.Field`s can
 * report their current overlay, aggregated and forwarded to `onOverlaysChange`. Defaults to
 * `undefined` (no-op) when used standalone (e.g. Storybook/tests).
 */
export const PanelOverlaysContext = React.createContext<FieldOverlayReporter | undefined>(undefined);
