import React from "react";

import type { SettingAnnotation } from "./Field";

/**
 * Reports a Setting.Field's current annotation list to an ancestor, keyed by field id. An empty
 * array retracts the entry (no annotations, or field unmounted).
 */
export type FieldAnnotationsReporter = (fieldId: string, annotations: SettingAnnotation[]) => void;

/**
 * Panel-scoped annotations context: `Setting.Panel` provides this so descendant `Setting.Field`s
 * can report their `SettingAnnotation[]`, aggregated and forwarded to `onAnnotationsChange`.
 * Defaults to `undefined` (no-op) when used standalone (e.g. Storybook/tests).
 */
export const PanelAnnotationsContext = React.createContext<FieldAnnotationsReporter | undefined>(undefined);
