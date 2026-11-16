import React from "react";

export type FieldState = {
    invalid: boolean;
    hasWarning: boolean;
};

export const FieldStateContext = React.createContext<FieldState>({
    invalid: false,
    hasWarning: false,
});

export function useFieldState(): FieldState {
    return React.useContext(FieldStateContext);
}

export type FieldStateDataAttributes = {
    "data-invalid"?: true;
    "data-warning"?: true;
};

/**
 * Returns data attributes derived from the nearest Field.Root's invalid/warning state,
 * ready to spread onto a custom component's root element. Pair with `data-invalid:` and
 * `data-warning:` Tailwind variants (or the `form-element` utility class) for styling.
 *
 * ```tsx
 * const fieldStateAttrs = useFieldStateDataAttributes();
 * <div {...fieldStateAttrs} className="form-element ..." />
 * ```
 */
export function useFieldStateDataAttributes(): FieldStateDataAttributes {
    const { invalid, hasWarning } = React.useContext(FieldStateContext);
    return {
        ...(invalid && { "data-invalid": true as const }),
        ...(hasWarning && { "data-warning": true as const }),
    };
}
