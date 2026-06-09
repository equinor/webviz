import React from "react";

export type FieldState = {
    invalid: boolean;
    hasWarning: boolean;
};

export const FieldStateContext = React.createContext<FieldState>({
    invalid: false,
    hasWarning: false,
});

/**
 * Returns the invalid/warning state set by the nearest Field.Root ancestor.
 * Use this in custom (non-BaseUI) components to mirror how BaseUI components respond to
 * Field.Root's `invalid` and `warning` props:
 *
 * ```tsx
 * const { invalid, hasWarning } = useFieldState();
 * <div
 *   data-invalid={invalid || undefined}
 *   data-warning={hasWarning || undefined}
 *   className="data-invalid:outline-danger data-warning:outline-warning ..."
 * />
 * ```
 */
export function useFieldState(): FieldState {
    return React.useContext(FieldStateContext);
}
